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
