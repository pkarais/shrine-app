import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/server"
import puppeteer from "puppeteer-core"
import fs from "fs"
import os from "os"
import path from "path"

async function getBrowser() {
  if (process.env.VERCEL) {
    const chromium = require("@sparticuz/chromium")
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })
  }

  const candidates: string[] = process.platform === "win32"
    ? [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        path.join(os.homedir(), "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"),
      ]
    : process.platform === "darwin"
    ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
    : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]

  const executablePath = candidates.find(c => fs.existsSync(c))
  if (!executablePath) throw new Error("Chrome not found locally. Install Google Chrome.")

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  })
}

function mdToHtml(md: string | null | undefined): string {
  if (!md) return ""
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)(\n(?!<li>)|$)/g, (match) => `<ul>${match}</ul>`)
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br>")
  return `<p>${html}</p>`
}

const SECTION_COLORS: Record<string, string> = {
  at_a_glance: "#06b6d4",
  scheduling_shifts: "#3b82f6",
  site_readiness: "#10b981",
  incidents_safety: "#f59e0b",
  maintenance_tickets: "#64748b",
  team_building: "#8b5cf6",
  upcoming_events: "#0ea5e9",
  manager_notes: "#f43f5e",
}

export async function POST(request: NextRequest) {
  try {
    const { issueId } = await request.json()
    if (!issueId) {
      return NextResponse.json({ error: "issueId required" }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: issue, error: issueError } = await admin
      .from("daily_brief_issues")
      .select("*")
      .eq("id", issueId)
      .single()

    if (issueError || !issue) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 })
    }

    const { data: sections } = await admin
      .from("daily_brief_sections")
      .select("*")
      .eq("issue_id", issueId)
      .order("section_order", { ascending: true })

    const metrics = (issue.content as any)?.metrics || {}
    const metricsHtml = Object.entries(metrics).map(([k, v]) => `
      <div class="metric-box">
        <div class="metric-value">${v}</div>
        <div class="metric-label">${k.replace(/_/g, " ")}</div>
      </div>
    `).join("")

    const sectionsHtml = (sections || []).map((s: any) => {
      const color = SECTION_COLORS[s.section_key] || "#1a3a5c"
      return `
        <div class="section" style="border-left-color:${color}">
          <h2 class="section-title" style="color:${color}">${s.section_title}</h2>
          <div class="section-body">${mdToHtml(s.markdown_body)}</div>
        </div>
      `
    }).join("")

    const dateLabel = issue.brief_date
      ? new Date(issue.brief_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
      : issue.title

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${issue.title}</title>
<style>
  @page { size: A4; margin: 0.6in; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; color: #1a1a1a; line-height: 1.5; margin: 0; }
  header { border-bottom: 3px solid #1a3a5c; padding-bottom: 1rem; margin-bottom: 1.5rem; }
  h1 { font-size: 1.5rem; margin: 0 0 0.25rem; color: #1a3a5c; }
  .meta { font-size: 0.75rem; color: #666; }
  .metrics { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1.5rem; }
  .metric-box { background: #f5f5f5; border-radius: 8px; padding: 0.6rem 1rem; text-align: center; min-width: 80px; flex: 1; }
  .metric-value { font-size: 1.4rem; font-weight: 900; color: #1a3a5c; }
  .metric-label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.05em; color: #666; font-weight: 700; margin-top: 2px; }
  .section { border-left: 4px solid #1a3a5c; padding-left: 1rem; margin-bottom: 1.25rem; page-break-inside: avoid; }
  .section-title { font-size: 0.95rem; font-weight: 700; margin: 0 0 0.4rem; text-transform: uppercase; letter-spacing: 0.04em; }
  .section-body { font-size: 0.82rem; }
  .section-body p { margin: 0.25rem 0; }
  .section-body ul { margin: 0.25rem 0; padding-left: 1.2rem; }
  .section-body li { margin-bottom: 0.15rem; }
  footer { margin-top: 2rem; border-top: 1px solid #e0e0e0; padding-top: 0.75rem; font-size: 0.65rem; color: #999; text-align: center; }
</style>
</head>
<body>
  <header>
    <h1>${issue.title}</h1>
    <p class="meta">${dateLabel} &bull; Status: ${issue.status} &bull; Generated ${new Date().toLocaleString()}</p>
  </header>
  ${metricsHtml ? `<div class="metrics">${metricsHtml}</div>` : ""}
  ${issue.opening_message ? `<p style="font-size:0.85rem;color:#444;margin-bottom:1.25rem;font-style:italic">${issue.opening_message}</p>` : ""}
  ${sectionsHtml}
  <footer>Shrine Operations &bull; Daily Brief &bull; Confidential — Staff Use Only</footer>
</body>
</html>`

    const browser = await getBrowser()
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "load" })

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0.6in", right: "0.6in", bottom: "0.6in", left: "0.6in" },
    })

    await browser.close()

    const filename = `${issue.slug || "daily-brief"}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
