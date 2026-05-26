import { createClient } from "@/utils/supabase/client"

export type OperationsBriefIssue = {
  id: string
  issue_month: string
  title: string
  slug: string
  opening_message?: string | null
  status: "draft" | "review" | "approved" | "published" | "archived" | string
  visibility: string
  prepared_by?: string | null
  published_at?: string | null
  pdf_url?: string | null
  website_url?: string | null
  content?: Record<string, any>
}

export type OperationsBriefSection = {
  id: string
  issue_id: string
  section_key: string
  section_title: string
  section_order: number
  content?: Record<string, any>
  markdown_body?: string | null
}

export async function generateOperationsBriefDraft(
  issueMonth: string,
  preparedBy?: string | null
) {
  const res = await fetch("/api/generate-operations-brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issueMonth, preparedBy: preparedBy ?? null }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to generate draft")
  return data as { issue: OperationsBriefIssue; sections: OperationsBriefSection[] }
}

export async function publishOperationsBrief(
  issueId: string,
  websiteUrl?: string | null,
  pdfUrl?: string | null
) {
  const supabase = createClient()
  const { error } = await supabase.rpc("publish_operations_brief", {
    p_issue_id: issueId,
    p_website_url: websiteUrl ?? null,
    p_pdf_url: pdfUrl ?? null,
  })
  if (error) throw error
}

export async function fetchOperationsBriefArchive() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("v_operations_brief_archive")
    .select("*")
    .order("issue_month", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function fetchOperationsBriefBySlug(slug: string) {
  const supabase = createClient()
  const { data: issue, error: issueError } = await supabase
    .from("operations_brief_issues")
    .select("*")
    .eq("slug", slug)
    .single()
  if (issueError) throw issueError

  const { data: sections, error: sectionError } = await supabase
    .from("operations_brief_sections")
    .select("*")
    .eq("issue_id", issue.id)
    .order("section_order", { ascending: true })
  if (sectionError) throw sectionError

  return { issue, sections: sections ?? [] }
}
