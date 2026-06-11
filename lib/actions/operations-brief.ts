"use server"
import { createAdminClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { requireAuth, requireManager } from "./auth-helpers"

const VALID_STATUSES = ["draft", "review", "published", "archived"] as const
type BriefStatus = typeof VALID_STATUSES[number]

const ALLOWED_TRANSITIONS: Record<BriefStatus, BriefStatus[]> = {
  draft: ["review"],
  review: ["published", "draft"],
  published: ["archived"],
  archived: ["draft"],
}

export async function updateIssueStatus(issueId: string, newStatus: string) {
  await requireManager()
  const admin = createAdminClient()

  const { data: issue, error: fetchError } = await admin
    .from("operations_brief_issues")
    .select("status")
    .eq("id", issueId)
    .single()

  if (fetchError || !issue) throw new Error("Issue not found")

  const current = issue.status as BriefStatus
  const next = newStatus as BriefStatus

  if (!VALID_STATUSES.includes(next)) throw new Error(`Invalid status: ${newStatus}`)
  if (!ALLOWED_TRANSITIONS[current]?.includes(next)) {
    throw new Error(`Cannot transition from "${current}" to "${next}"`)
  }

  const updates: Record<string, any> = { status: next, updated_at: new Date().toISOString() }
  if (next === "published") updates.published_at = new Date().toISOString()

  const { error } = await admin.from("operations_brief_issues").update(updates).eq("id", issueId)
  if (error) throw new Error(error.message)

  revalidatePath("/operations-brief")
  revalidatePath("/operations-brief/archive")
}

export async function updateIssueField(issueId: string, field: string, value: any) {
  await requireManager()
  const allowedFields = ["opening_message", "title", "visibility", "content"]
  if (!allowedFields.includes(field)) throw new Error(`Field "${field}" cannot be edited`)

  const admin = createAdminClient()
  const { error } = await admin
    .from("operations_brief_issues")
    .update({ [field]: value, updated_at: new Date().toISOString() })
    .eq("id", issueId)
  if (error) throw new Error(error.message)

  revalidatePath("/operations-brief")
}

export async function updateBriefSection(
  sectionId: string,
  markdownBody: string,
  contentPatch?: Record<string, unknown>
) {
  await requireManager()
  const admin = createAdminClient()

  const updates: Record<string, unknown> = {
    markdown_body: markdownBody,
    updated_at: new Date().toISOString(),
  }

  if (contentPatch) {
    const { data: existing, error: fetchErr } = await admin
      .from("operations_brief_sections")
      .select("content")
      .eq("id", sectionId)
      .single()
    if (fetchErr) throw new Error(fetchErr.message)
    updates.content = { ...(existing?.content ?? {}), ...contentPatch }
  }

  const { error } = await admin
    .from("operations_brief_sections")
    .update(updates)
    .eq("id", sectionId)
  if (error) throw new Error(error.message)

  revalidatePath("/operations-brief")
}

export async function updateSectionContent(
  sectionId: string,
  markdownBody: string,
  content?: Record<string, any>
) {
  await requireManager()
  const admin = createAdminClient()
  const updates: Record<string, any> = {
    markdown_body: markdownBody,
    updated_at: new Date().toISOString(),
  }
  if (content !== undefined) updates.content = content

  const { error } = await admin.from("operations_brief_sections").update(updates).eq("id", sectionId)
  if (error) throw new Error(error.message)

  revalidatePath("/operations-brief")
}

export async function fetchIssueBySlug(slug: string) {
  await requireAuth()
  const admin = createAdminClient()
  const { data: issue, error: issueError } = await admin
    .from("operations_brief_issues")
    .select("*")
    .eq("slug", slug)
    .single()
  if (issueError || !issue) return null

  const { data: sections } = await admin
    .from("operations_brief_sections")
    .select("*")
    .eq("issue_id", issue.id)
    .order("section_order", { ascending: true })

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", issue.prepared_by)
    .single()

  return { issue: { ...issue, prepared_by_name: profile?.full_name || null }, sections: sections ?? [] }
}

export async function saveWebsiteUrl(issueId: string, url: string) {
  await requireManager()
  if (url && !/^https?:\/\/.+/.test(url)) throw new Error("URL must start with http:// or https://")
  const admin = createAdminClient()
  const { error } = await admin
    .from("operations_brief_issues")
    .update({ website_url: url || null, updated_at: new Date().toISOString() })
    .eq("id", issueId)
  if (error) throw new Error(error.message)
  revalidatePath("/operations-brief")
}

function markdownToHtml(md: string): string {
  return md
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li style=\"margin:4px 0;\">$1</li>")
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul style="margin:8px 0;padding-left:20px;">${m}</ul>`)
    .replace(/\n/g, "<br/>")
}

function sectionAccent(key: string): { border: string; bg: string } {
  if (["at_a_glance", "sop_spotlight", "supplies_vendors_equipment", "next_month_priorities"].includes(key)) {
    return { border: "#002c5e", bg: "#e8f1ff" }
  }
  if (["security_safety", "recognition_badges", "leaderboard"].includes(key)) {
    return { border: "#735c00", bg: "#fff8d6" }
  }
  if (key === "staff_reminders") {
    return { border: "#ba1a1a", bg: "#ffdad6" }
  }
  return { border: "#747685", bg: "#f3f4f5" }
}

function buildOperationsBriefHtml(issue: any, sections: any[]): string {
  const month = (() => {
    if (!issue.issue_month) return ""
    const ym = String(issue.issue_month).slice(0, 7) // handles "2026-05" or "2026-05-01"
    const [y, m] = ym.split("-").map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
  })()

  const sectionsHtml = sections
    .map((s) => {
      const { border, bg } = sectionAccent(s.section_key || "")
      const body = s.markdown_body || "No content."
      const truncated = body.length > 600 ? body.slice(0, 600).replace(/\s+\S*$/, "") + "…" : body
      return `
      <div style="border-left:4px solid ${border};background:${bg};border-radius:0 10px 10px 0;padding:16px 18px;margin-bottom:14px;">
        <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:#444653;">${(s.section_key || "").replaceAll("_", " ")}</p>
        <h3 style="margin:0 0 10px;font-size:16px;font-weight:800;color:#191c1d;">${s.section_title}</h3>
        <div style="font-size:14px;line-height:1.7;color:#191c1d;">${markdownToHtml(truncated)}</div>
      </div>`
    })
    .join("")

  const links = [
    issue.website_url ? `<a href="${issue.website_url}" style="display:inline-block;background:#002c5e;color:#fff;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px;text-decoration:none;">View Online</a>` : "",
    issue.pdf_url ? `<a href="${issue.pdf_url}" style="display:inline-block;background:#fed65b;color:#191c1d;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px;text-decoration:none;">Download PDF</a>` : "",
  ]
    .filter(Boolean)
    .join("&nbsp;&nbsp;")

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:640px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="background:#002c5e;height:4px;"></div>
    <div style="background:#1a4a8c;padding:32px 32px 28px;border-bottom:3px solid #fed65b;">
      <img src="${process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')}/images/logo-white.png" alt="Saint Nicholas Shrine" width="180" style="height:auto;max-width:180px;display:block;margin-bottom:20px;" />
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,0.65);">Operations Monthly Brief</p>
      <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;line-height:1.1;">${issue.title || "Operations Monthly Brief"}</h1>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.75);">${month} &bull; Facilities &bull; Safety &bull; Service Readiness &bull; Recognition</p>
    </div>
    <div style="padding:24px 32px 8px;">
      ${issue.opening_message ? `<div style="border-left:4px solid #fed65b;background:#fef9e7;border-radius:0 10px 10px 0;padding:14px 18px;margin-bottom:20px;font-size:14px;color:#191c1d;line-height:1.6;">${issue.opening_message}</div>` : ""}
      ${sectionsHtml}
    </div>
    <div style="background:#f3f4f5;border-top:1px solid #c4c5d5;padding:24px 32px;text-align:center;">
      ${links ? `<p style="margin:0 0 16px;">${links}</p>` : ""}
      <p style="margin:0;font-size:12px;font-weight:700;color:#444653;">Operations Monthly Brief</p>
      <p style="margin:4px 0 0;font-size:11px;color:#747685;">Site Management Operations &mdash; Confidential</p>
    </div>
  </div>
</body>
</html>`
}

export async function sendOperationsBriefEmail(issueId: string, recipientsCsv: string) {
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
  const { data: issue } = await admin.from("operations_brief_issues").select("*").eq("id", issueId).single()
  if (!issue) throw new Error("Issue not found")

  const { data: sections } = await admin
    .from("operations_brief_sections")
    .select("*")
    .eq("issue_id", issueId)
    .order("section_order", { ascending: true })

  const { Resend } = await import("resend")
  const resend = new Resend(process.env.RESEND_API_KEY)

  const html = buildOperationsBriefHtml(issue, sections ?? [])

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to: recipients,
    subject: issue.title || "Operations Monthly Brief",
    html,
  })

  if (error) throw new Error((error as any).message ?? "Email send failed")
}
