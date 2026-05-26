import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/server"
import puppeteer from "puppeteer-core"
import path from "path"
import os from "os"

function findChrome() {
  // Windows
  if (os.platform() === "win32") {
    const candidates = [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      path.join(os.homedir(), "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"),
    ]
    for (const c of candidates) {
      try {
        if (require("fs").existsSync(c)) return c
      } catch {}
    }
  }
  // macOS
  if (os.platform() === "darwin") {
    const c = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    try { if (require("fs").existsSync(c)) return c } catch {}
  }
  // Linux
  const linuxCandidates = ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  for (const c of linuxCandidates) {
    try { if (require("fs").existsSync(c)) return c } catch {}
  }
  return undefined
}

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
  @page { size: A4; margin: 0.75in; }
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 100%; margin: 0; padding: 0; color: #1a1a1a; line-height: 1.5; }
  h1 { font-size: 1.8rem; border-bottom: 3px solid #1a3a5c; padding-bottom: 0.5rem; margin-bottom: 0.5rem; }
  h2 { font-size: 1.1rem; margin-top: 1.5rem; color: #1a3a5c; page-break-after: avoid; }
  .meta { color: #666; font-size: 0.8rem; margin-bottom: 1rem; }
  .opening { font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin: 1rem 0; }
  .metric { background: #f5f5f5; border-radius: 6px; padding: 0.5rem; text-align: center; }
  .metric-label { font-size: 0.6rem; text-transform: uppercase; color: #666; font-weight: 700; }
  .metric-value { font-size: 1.2rem; font-weight: 900; }
  .section { margin: 1rem 0; padding: 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; page-break-inside: avoid; }
  .section-body { font-size: 0.85rem; line-height: 1.4; }
  pre { background: #f5f5f5; padding: 0.5rem; border-radius: 4px; font-size: 0.7rem; overflow-x: auto; white-space: pre-wrap; }
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

    const chromePath = findChrome()
    if (!chromePath) {
      return NextResponse.json({ error: "Chrome not found. Cannot generate PDF." }, { status: 500 })
    }

    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "load" })

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0.75in", right: "0.75in", bottom: "0.75in", left: "0.75in" },
    })

    await browser.close()

    const { data: uploadData, error: uploadError } = await admin.storage
      .from("operations-brief-public")
      .upload(`${issueId}/brief.pdf`, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicUrl } = admin.storage
      .from("operations-brief-public")
      .getPublicUrl(`${issueId}/brief.pdf`)

    return NextResponse.json({ pdfUrl: publicUrl?.publicUrl || null })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
