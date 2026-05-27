"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { requireManager } from "@/lib/actions/auth-helpers"

export async function generateDailyBriefDraft(briefDate?: string) {
  const user = await requireManager()

  const dateStr = briefDate ? briefDate.slice(0, 10) : new Date().toISOString().slice(0, 10)
  const slug = `daily-brief-${dateStr}`
  // Use noon UTC so toLocaleDateString displays the correct date in any timezone
  const targetDate = new Date(`${dateStr}T12:00:00.000Z`)

  const admin = createAdminClient()

  // Gather daily data — UTC-explicit range, no FK joins
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`)
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`)

  const [
    { data: shifts },
    { data: incidents },
    { data: walkthroughs },
    { data: tickets },
    { data: events },
    { data: assignments },
  ] = await Promise.all([
    admin.from("shifts").select("id, user_id, clock_in, clock_out").gte("clock_in", dayStart.toISOString()).lte("clock_in", dayEnd.toISOString()),
    admin.from("incidents").select("id, user_id, severity, description, location, created_at").gte("created_at", dayStart.toISOString()).lte("created_at", dayEnd.toISOString()),
    admin.from("walkthroughs").select("id, user_id, walkthrough_type, category, completed_at").gte("completed_at", dayStart.toISOString()).lte("completed_at", dayEnd.toISOString()),
    admin.from("maintenance_tickets").select("id, title, priority, status, created_at").gte("created_at", dayStart.toISOString()).lte("created_at", dayEnd.toISOString()),
    admin.from("events").select("*").gte("start_time", dayStart.toISOString()).lte("start_time", dayEnd.toISOString()).order("start_time"),
    admin.from("staff_assignments").select("id").gte("created_at", dayStart.toISOString()).lte("created_at", dayEnd.toISOString()),
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
      markdown_body: `**Staff on Duty:** ${totalStaff}\n**Currently Active:** ${activeStaff}\n**Walkthroughs:** ${completedWalkthroughs}\n**Open Tickets:** ${openTickets}\n**Incidents:** ${incidentCount}\n**Events Today:** ${upcomingEvents}`,
      content: { totalStaff, activeStaff, completedWalkthroughs, openTickets, incidentCount, upcomingEvents },
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
    const clockIn = new Date(s.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    const clockOut = s.clock_out ? new Date(s.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Active"
    return `- **${name}** (${role}): ${clockIn} — ${clockOut}`
  })
  return lines.join("\n")
}

function generateWalkthroughMarkdown(walkthroughs: any[], profileMap: Map<string, any>) {
  if (!walkthroughs.length) return "No walkthroughs completed today."
  const lines = walkthroughs.map((w) => {
    const name = profileMap.get(w.user_id)?.full_name || "Unknown"
    const time = new Date(w.completed_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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
    const time = new Date(e.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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

export async function getDailyBriefsForMonthlySummary(monthStart: string, monthEnd: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("daily_brief_issues")
    .select("brief_date, title, content, status")
    .gte("brief_date", monthStart)
    .lte("brief_date", monthEnd)
    .eq("status", "published")
    .order("brief_date", { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}
