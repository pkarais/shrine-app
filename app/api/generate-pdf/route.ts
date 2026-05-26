import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { issueId } = body

    if (!issueId) {
      return NextResponse.json({ error: "issueId is required" }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: issue, error: issueError } = await admin
      .from("operations_brief_issues")
      .select("*, operations_brief_sections(*)")
      .eq("id", issueId)
      .order("section_order", { foreignTable: "operations_brief_sections", ascending: true })
      .single()

    if (issueError || !issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 })
    }

    const sections = (issue as any).operations_brief_sections || []
    const metrics = (issue as any).content?.metrics || {}
    const monthLabel = new Date((issue as any).issue_month).toLocaleDateString(undefined, { month: "long", year: "numeric" })

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${(issue as any).title}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1a1a1a; }
  h1 { font-size: 2rem; border-bottom: 3px solid #1a3a5c; padding-bottom: 0.5rem; }
  h2 { font-size: 1.25rem; margin-top: 2rem; color: #1a3a5c; }
  .meta { color: #666; font-size: 0.875rem; margin-bottom: 1.5rem; }
  .opening { font-size: 1.05rem; line-height: 1.6; margin-bottom: 2rem; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin: 1.5rem 0; }
  .metric { background: #f5f5f5; border-radius: 8px; padding: 0.75rem; }
  .metric-label { font-size: 0.7rem; text-transform: uppercase; color: #666; font-weight: 700; }
  .metric-value { font-size: 1.5rem; font-weight: 900; }
  .section { margin: 1.5rem 0; padding: 1rem; border: 1px solid #e0e0e0; border-radius: 8px; }
  .section-body { font-size: 0.925rem; line-height: 1.5; }
  pre { background: #f5f5f5; padding: 0.75rem; border-radius: 6px; font-size: 0.8rem; overflow-x: auto; }
</style></head>
<body>
  <div class="meta">${monthLabel}</div>
  <h1>${(issue as any).title}</h1>
  <p class="opening">${(issue as any).opening_message || ""}</p>
  <div class="metrics">
    ${Object.entries(metrics).map(([k, v]) => `
      <div class="metric">
        <div class="metric-label">${k.replaceAll("_", " ")}</div>
        <div class="metric-value">${v}</div>
      </div>
    `).join("")}
  </div>
  ${sections.map((s: any) => `
    <div class="section">
      <h2>${s.section_title}</h2>
      ${s.markdown_body ? `<p class="section-body">${s.markdown_body}</p>` : ""}
      ${s.content && Object.keys(s.content).length > 0 ? `<pre>${JSON.stringify(s.content, null, 2)}</pre>` : ""}
    </div>
  `).join("")}
</body></html>`

    const { data: uploadData, error: uploadError } = await admin.storage
      .from("operations-brief-public")
      .upload(`${issueId}/brief.html`, new Blob([html], { type: "text/html" }), { upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicUrl } = admin.storage
      .from("operations-briefs")
      .getPublicUrl(`${issueId}/brief.html`)

    return NextResponse.json({ pdfUrl: publicUrl?.publicUrl || null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
