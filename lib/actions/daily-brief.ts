"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { requireManager } from "@/lib/actions/auth-helpers"
import { toEasternIso } from "@/lib/eastern-time"

export async function generateDailyBriefDraft(briefDate?: string) {
  const user = await requireManager()

  const dateStr = briefDate ? briefDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
  const slug = `daily-brief-${dateStr}`
  // Use noon UTC so toLocaleDateString displays the correct date in any timezone
  const targetDate = new Date(`${dateStr}T12:00:00.000Z`)

  const admin = createAdminClient()

  // Gather daily data — Eastern Time midnight boundaries so that shifts
  // clocked in after 8 PM ET (which is already the next UTC day) are
  // still included in the correct day's brief.
  const dayStart = new Date(toEasternIso(dateStr, "00:00"))
  const dayEnd = new Date(toEasternIso(dateStr, "23:59"))

  const [
    { data: shifts },
    { data: incidents },
    { data: walkthroughs },
    { data: tickets },
    { data: events },
    { data: assignments },
    { data: visitorRows },
  ] = await Promise.all([
    admin.from("shifts").select("id, user_id, clock_in, clock_out").gte("clock_in", dayStart.toISOString()).lte("clock_in", dayEnd.toISOString()),
    admin.from("incidents").select("id, user_id, severity, description, location, created_at").gte("created_at", dayStart.toISOString()).lte("created_at", dayEnd.toISOString()),
    admin.from("walkthroughs").select("id, user_id, walkthrough_type, category, completed_at").gte("completed_at", dayStart.toISOString()).lte("completed_at", dayEnd.toISOString()),
    admin.from("maintenance_tickets").select("id, title, priority, status, created_at").gte("created_at", dayStart.toISOString()).lte("created_at", dayEnd.toISOString()),
    admin.from("events").select("*").gte("start_time", dayStart.toISOString()).lte("start_time", dayEnd.toISOString()).order("start_time"),
    admin.from("staff_assignments").select("id").gte("created_at", dayStart.toISOString()).lte("created_at", dayEnd.toISOString()),
    admin.from("visitor_volume").select("count, recorded_at").gte("recorded_at", dayStart.toISOString()).lte("recorded_at", dayEnd.toISOString()),
  ])

  // Batch-fetch profiles for all referenced user_ids
  const allUserIds = Array.from(new Set([
    ...(shifts || []).map((s: any) => s.user_id),
    ...(incidents || []).map((i: any) => i.user_id),
    ...(walkthroughs || []).map((w: any) => w.user_id),
  ].filter(Boolean)))
  const { data: profilesData } = allUserIds.length
    ? await admin.from("profiles").select("id, full_name, role").in("id", allUserIds)
    : { data: [] as any[] }
  const profileMap = new Map((profilesData || []).map((p: any) => [p.id, p]))

  // Metrics
  const totalStaff = new Set((shifts || []).map((s: any) => s.user_id)).size
  const activeStaff = (shifts || []).filter((s: any) => !s.clock_out).length
  const completedWalkthroughs = (walkthroughs || []).length
  const openTickets = (tickets || []).filter((t: any) => t.status === "open").length
  const incidentCount = (incidents || []).length
  const upcomingEvents = (events || []).length

  // Visitor totals for the day (so dailies can later be rolled up into
  // bi-weekly / monthly reports without re-querying visitor_volume).
  //
  // Visitor counts are SNAPSHOTS — "there are N visitors right now".
  // We must use the LAST snapshot of the day, not sum all snapshots.
  const lastSnapshot = (visitorRows || []).length > 0
    ? (visitorRows || []).sort((a: any, b: any) =>
        new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
      ).at(-1)
    : null

  const visitorsTotal = lastSnapshot ? Number(lastSnapshot.count) || 0 : 0
  const visitorsPeakHour = lastSnapshot
    ? Number(
        new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false }).format(
          new Date(lastSnapshot.recorded_at as string)
        ),
      ) % 24
    : null
  const visitorsPeakHourCount = visitorsTotal

  // Upsert the brief issue
  const { data: issue, error: issueError } = await admin
    .from("daily_brief_issues")
    .upsert({
      brief_date: dateStr,
      title: `Operations Daily Brief — ${targetDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`,
      slug,
      opening_message: `Daily operations summary for ${dateStr}. ${totalStaff} staff members clocked in, ${completedWalkthroughs} walkthroughs completed, ${incidentCount} incidents reported.`,
      status: "draft",
      visibility: "staff",
      prepared_by: user.id,
      content: {
        metrics: {
          staff_on_duty: totalStaff,
          active_now: activeStaff,
          walkthroughs_completed: completedWalkthroughs,
          open_tickets: openTickets,
          incidents: incidentCount,
          upcoming_events: upcomingEvents,
          visitors_total: visitorsTotal,
          visitors_peak_hour: visitorsPeakHour,
          visitors_peak_hour_count: visitorsPeakHourCount,
        }
      },
    }, { onConflict: "brief_date" })
    .select()
    .single()

  if (issueError) throw new Error(issueError.message)

  // Generate sections
  const sections = [
    {
      section_key: "at_a_glance",
      section_title: "At a Glance",
      section_order: 1,
      markdown_body: `**Staff on Duty:** ${totalStaff}\n**Currently Active:** ${activeStaff}\n**Walkthroughs:** ${completedWalkthroughs}\n**Open Tickets:** ${openTickets}\n**Incidents:** ${incidentCount}\n**Events Today:** ${upcomingEvents}\n**Visitors Today:** ${visitorsTotal.toLocaleString()}${visitorsPeakHour !== null ? ` (peak ${visitorsPeakHour}:00 ET, ${visitorsPeakHourCount.toLocaleString()})` : ""}`,
      content: { totalStaff, activeStaff, completedWalkthroughs, openTickets, incidentCount, upcomingEvents, visitorsTotal, visitorsPeakHour, visitorsPeakHourCount },
    },
    {
      section_key: "scheduling_shifts",
      section_title: "Scheduling & Shifts",
      section_order: 2,
      markdown_body: generateShiftMarkdown(shifts || [], profileMap),
      content: { shifts: (shifts || []).map((s: any) => ({ name: profileMap.get(s.user_id)?.full_name || "Unknown", role: profileMap.get(s.user_id)?.role, clock_in: s.clock_in, clock_out: s.clock_out })) },
    },
    {
      section_key: "site_readiness",
      section_title: "Site Readiness",
      section_order: 3,
      markdown_body: generateWalkthroughMarkdown(walkthroughs || [], profileMap),
      content: { walkthroughs: (walkthroughs || []).map((w: any) => ({ type: w.walkthrough_type, category: w.category, by: profileMap.get(w.user_id)?.full_name, completed_at: w.completed_at })) },
    },
    {
      section_key: "incidents_safety",
      section_title: "Incidents & Safety",
      section_order: 4,
      markdown_body: generateIncidentMarkdown(incidents || [], profileMap),
      content: { incidents: (incidents || []).map((i: any) => ({ severity: i.severity, description: i.description, location: i.location, by: profileMap.get(i.user_id)?.full_name })) },
    },
    {
      section_key: "maintenance_tickets",
      section_title: "Maintenance & Tickets",
      section_order: 5,
      markdown_body: generateTicketMarkdown(tickets || []),
      content: { tickets: (tickets || []).map((t: any) => ({ title: t.title, priority: t.priority, status: t.status })) },
    },
    {
      section_key: "team_building",
      section_title: "Team Building & Recognition",
      section_order: 6,
      markdown_body: `Staff assignments and team coordination for today's events. ${(assignments || []).length} assignments made across ${upcomingEvents} events.`,
      content: { assignments: (assignments || []).length, events: upcomingEvents },
    },
    {
      section_key: "upcoming_events",
      section_title: "Today's Events",
      section_order: 7,
      markdown_body: generateEventsMarkdown(events || []),
      content: { events: (events || []).map((e: any) => ({ title: e.title, start: e.start_time, category: e.category })) },
    },
    {
      section_key: "manager_notes",
      section_title: "Manager Notes",
      section_order: 8,
      markdown_body: `*Add your observations, action items, and priorities for the team here.*`,
      content: {},
    },
  ]

  // Delete old sections and insert new ones
  await admin.from("daily_brief_sections").delete().eq("issue_id", issue.id)

  for (const section of sections) {
    await admin.from("daily_brief_sections").insert({
      issue_id: issue.id,
      section_key: section.section_key,
      section_title: section.section_title,
      section_order: section.section_order,
      markdown_body: section.markdown_body,
      content: section.content,
    })
  }

  return { success: true, issueId: issue.id, slug }
}

function generateShiftMarkdown(shifts: any[], profileMap: Map<string, any>) {
  if (!shifts.length) return "No shifts recorded today."
  const lines = shifts.map((s) => {
    const name = profileMap.get(s.user_id)?.full_name || "Unknown"
    const role = profileMap.get(s.user_id)?.role || "staff"
    const clockIn = new Date(s.clock_in).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" })
    const clockOut = s.clock_out ? new Date(s.clock_out).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" }) : "Active"
    return `- **${name}** (${role}): ${clockIn} — ${clockOut}`
  })
  return lines.join("\n")
}

function generateWalkthroughMarkdown(walkthroughs: any[], profileMap: Map<string, any>) {
  if (!walkthroughs.length) return "No walkthroughs completed today."
  const lines = walkthroughs.map((w) => {
    const name = profileMap.get(w.user_id)?.full_name || "Unknown"
    const time = new Date(w.completed_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" })
    return `- **${w.walkthrough_type}** (${w.category}) — ${name} at ${time}`
  })
  return lines.join("\n")
}

function generateIncidentMarkdown(incidents: any[], profileMap: Map<string, any>) {
  if (!incidents.length) return "No incidents reported today."
  const lines = incidents.map((i) => {
    const name = profileMap.get(i.user_id)?.full_name || "Unknown"
    const severity = i.severity || "unknown"
    return `- **[${severity.toUpperCase()}]** ${i.description?.slice(0, 100)}... — ${name} at ${i.location || "N/A"}`
  })
  return lines.join("\n")
}

function generateTicketMarkdown(tickets: any[]) {
  if (!tickets.length) return "No tickets created today."
  const lines = tickets.map((t) => {
    return `- **${t.title}** (${t.priority}, ${t.status})`
  })
  return lines.join("\n")
}

function generateEventsMarkdown(events: any[]) {
  if (!events.length) return "No events scheduled today."
  const lines = events.map((e) => {
    const time = new Date(e.start_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" })
    return `- **${e.title}** at ${time} (${e.category})`
  })
  return lines.join("\n")
}

export async function fetchDailyBriefBySlug(slug: string) {
  const admin = createAdminClient()
  const { data: issue, error } = await admin
    .from("daily_brief_issues")
    .select("*")
    .eq("slug", slug)
    .single()

  if (error || !issue) return null

  const { data: sections } = await admin
    .from("daily_brief_sections")
    .select("*")
    .eq("issue_id", issue.id)
    .order("section_order", { ascending: true })

  return { issue, sections }
}

export async function updateDailyBriefStatus(issueId: string, status: string) {
  await requireManager()
  const admin = createAdminClient()

  const updates: any = { status }
  if (status === "published") {
    updates.published_at = new Date().toISOString()
  }

  const { error } = await admin.from("daily_brief_issues").update(updates).eq("id", issueId)
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function updateDailyBriefField(issueId: string, field: string, value: string) {
  await requireManager()
  const admin = createAdminClient()

  const { error } = await admin.from("daily_brief_issues").update({ [field]: value }).eq("id", issueId)
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function updateDailySectionContent(sectionId: string, markdownBody: string) {
  await requireManager()
  const admin = createAdminClient()

  const { error } = await admin.from("daily_brief_sections").update({ markdown_body: markdownBody }).eq("id", sectionId)
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function getDailyBriefArchive() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("daily_brief_issues")
    .select("id, slug, title, brief_date, status, prepared_by, published_at")
    .in("status", ["published", "archived"])
    .order("brief_date", { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return data || []
}

function markdownToHtmlDaily(md: string): string {
  return md
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li style=\"margin:4px 0;\">$1</li>")
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul style="margin:8px 0;padding-left:20px;">${m}</ul>`)
    .replace(/\n/g, "<br/>")
}

function dailySectionAccent(key: string): { border: string; bg: string } {
  if (["at_a_glance", "sop_spotlight", "supplies_vendors_equipment", "next_priorities"].includes(key)) {
    return { border: "#002c5e", bg: "#e8f1ff" }
  }
  if (["security_safety", "recognition", "incidents"].includes(key)) {
    return { border: "#735c00", bg: "#fff8d6" }
  }
  if (key === "reminders" || key === "staff_reminders") {
    return { border: "#ba1a1a", bg: "#ffdad6" }
  }
  return { border: "#747685", bg: "#f3f4f5" }
}

function buildDailyBriefHtml(issue: any, sections: any[]): string {
  const dateLabel = issue.brief_date
    ? new Date(issue.brief_date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : ""

  const metrics = issue.content?.metrics ?? {}
  const metricsHtml = Object.entries(metrics)
    .map(
      ([key, val]) =>
        `<td style="text-align:center;padding:14px 8px;background:#fff;"><div style="font-size:24px;font-weight:900;color:#002c5e;">${val}</div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#444653;margin-top:4px;">${key.replace(/_/g, " ")}</div></td>`
    )
    .join("")

  const sectionsHtml = sections
    .map((s) => {
      const { border, bg } = dailySectionAccent(s.section_key || "")
      const body = s.markdown_body || "No content."
      const truncated = body.length > 600 ? body.slice(0, 600).replace(/\s+\S*$/, "") + "…" : body
      return `
      <div style="border-left:4px solid ${border};background:${bg};border-radius:0 10px 10px 0;padding:16px 18px;margin-bottom:14px;">
        <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#444653;">${(s.section_key || "").replaceAll("_", " ")}</p>
        <h3 style="margin:0 0 10px;font-size:16px;font-weight:800;color:#191c1d;">${s.section_title}</h3>
        <div style="font-size:14px;line-height:1.7;color:#191c1d;">${markdownToHtmlDaily(truncated)}</div>
      </div>`
    })
    .join("")

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="background:#002c5e;height:4px;"></div>
    <div style="background:#1a4a8c;padding:32px 32px 28px;border-bottom:3px solid #fed65b;">
      <img src="${process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')}/images/logo-white.png" alt="Saint Nicholas Shrine" width="180" style="height:auto;max-width:180px;display:block;margin-bottom:20px;" />
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,0.65);">Daily Operations Brief</p>
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;line-height:1.1;">${issue.title || "Daily Brief"}</h1>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);">${dateLabel}</p>
    </div>
    ${metricsHtml ? `<div style="background:#f8f9fa;border-bottom:1px solid #c4c5d5;padding:0 16px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>${metricsHtml}</tr></table></div>` : ""}
    <div style="padding:24px 32px 8px;">
      ${issue.opening_message ? `<div style="border-left:4px solid #fed65b;background:#fef9e7;border-radius:0 10px 10px 0;padding:14px 18px;margin-bottom:20px;font-size:14px;color:#191c1d;line-height:1.6;">${issue.opening_message}</div>` : ""}
      ${sectionsHtml}
    </div>
    <div style="background:#f3f4f5;border-top:1px solid #c4c5d5;padding:24px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;font-weight:700;color:#444653;">Daily Operations Brief</p>
      <p style="margin:4px 0 0;font-size:11px;color:#747685;">Site Management Operations &mdash; Confidential</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendDailyBriefEmail(issueId: string, recipientsCsv: string) {
  await requireManager()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const recipients = recipientsCsv
    .split(/[\s,;]+/)
    .map((e) => e.trim())
    .filter(Boolean)
  if (!recipients.length) throw new Error("No recipients provided")
  for (const r of recipients) {
    if (!emailRegex.test(r)) throw new Error(`Invalid email address: ${r}`)
  }

  const admin = createAdminClient()
  const { data: issue } = await admin.from("daily_brief_issues").select("*").eq("id", issueId).single()
  if (!issue) throw new Error("Issue not found")

  const { data: sections } = await admin
    .from("daily_brief_sections")
    .select("*")
    .eq("issue_id", issueId)
    .order("section_order", { ascending: true })

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)

  const html = buildDailyBriefHtml(issue, sections ?? [])

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to: recipients,
    subject: issue.title || "Daily Operations Brief",
    html,
  })

  if (error) throw new Error((error as any).message ?? "Email send failed")
}
