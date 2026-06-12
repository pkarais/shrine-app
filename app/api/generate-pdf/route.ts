import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/server"
import puppeteer from "puppeteer-core"
import fs from "fs"
import os from "os"
import path from "path"

async function getBrowser() {
  if (process.env.VERCEL) {
    // Vercel serverless — use @sparticuz/chromium
    const chromium = require("@sparticuz/chromium")
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    })
  }

  // Local dev — find installed system Chrome
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
    // Escape angle brackets that are literal (not intended as tags) before we add our own
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headings
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // Bold / italic
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    // Numbered list items
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    // Wrap consecutive <li> runs in <ul>
    .replace(/(<li>[\s\S]*?<\/li>)(\n(?!<li>)|$)/g, (match) => `<ul>${match}</ul>`)
    // Blank lines → paragraph breaks
    .replace(/\n{2,}/g, "</p><p>")
    // Remaining single newlines → <br>
    .replace(/\n/g, "<br>")
  return `<p>${html}</p>`
}

function formatValue(key: string, val: any): string {
  if (val === null || val === undefined) return "—"
  // ISO date strings
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return new Date(val).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  }
  return String(val)
}

const SKIP_KEYS = new Set(["id", "issue_id", "created_by", "updated_at"])
const LABEL_MAP: Record<string, string> = {
  title: "Title", status: "Status", priority: "Priority",
  created_at: "Date", resolved_at: "Resolved", full_name: "Name",
  badge_type: "Badge", points: "Points", section_key: "Section",
  incident_type: "Type", description: "Description", severity: "Severity",
  location: "Location", shift_date: "Date",
}

function contentToHtml(content: Record<string, any>): string {
  if (!content || Object.keys(content).length === 0) return ""

  // Get the primary array (items, entries, tickets, staff, etc.)
  const arrayEntry = Object.entries(content).find(([, v]) => Array.isArray(v))
  const scalarEntries = Object.entries(content).filter(([, v]) => !Array.isArray(v) && typeof v !== "object")

  let html = ""

  // Scalar key-value pairs (counts, summaries)
  if (scalarEntries.length > 0) {
    html += `<table style="width:100%;border-collapse:collapse;font-size:0.78rem;margin-bottom:0.5rem">`
    for (const [k, v] of scalarEntries) {
      if (SKIP_KEYS.has(k)) continue
      const label = LABEL_MAP[k] ?? k.replaceAll("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
      html += `<tr><td style="padding:3px 8px 3px 0;color:#555;font-weight:600;white-space:nowrap;width:35%">${label}</td><td style="padding:3px 0">${formatValue(k, v)}</td></tr>`
    }
    html += `</table>`
  }

  // Array of items → render as item cards
  if (arrayEntry) {
    const [, items] = arrayEntry
    if (Array.isArray(items) && items.length > 0) {
      html += `<div style="display:flex;flex-direction:column;gap:6px">`
      for (const item of items) {
        if (typeof item !== "object" || item === null) {
          html += `<div style="padding:4px 0;font-size:0.8rem;border-bottom:1px solid #eee">${String(item)}</div>`
          continue
        }
        const entries = Object.entries(item).filter(([k]) => !SKIP_KEYS.has(k))
        const titleVal = item.title ?? item.full_name ?? item.name ?? null
        const statusVal = item.status ?? item.priority ?? item.severity ?? null
        html += `<div style="background:#f9f9f9;border:1px solid #e0e0e0;border-radius:5px;padding:6px 10px;font-size:0.78rem">`
        if (titleVal) {
          html += `<div style="font-weight:700;margin-bottom:3px">${String(titleVal)}</div>`
        }
        html += `<table style="width:100%;border-collapse:collapse">`
        for (const [k, v] of entries) {
          if (k === "title" || k === "full_name" || k === "name") continue
          const label = LABEL_MAP[k] ?? k.replaceAll("_", " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
          html += `<tr><td style="color:#666;font-weight:600;width:30%;padding:1px 6px 1px 0;white-space:nowrap">${label}</td><td style="padding:1px 0">${formatValue(k, v)}</td></tr>`
        }
        html += `</table></div>`
      }
      html += `</div>`
    }
  }

  return html
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
  .section-body { font-size: 0.85rem; line-height: 1.4; margin-bottom: 0.5rem; }
  .section-content { font-size: 0.8rem; }
  .section-body p { margin: 0.2rem 0; }
  .section-body ul { margin: 0.25rem 0 0.25rem 1.2rem; padding: 0; }
  .section-body li { margin: 0.15rem 0; }
</style></head>
<body>
  <img src="${process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')}/images/logo-color.jpg" alt="Saint Nicholas Shrine" style="display:block;height:56px;width:auto;margin:0 0 12px;" />
  <div class="meta">${monthLabel}</div>
  <h1>${(issue as any).title}</h1>
  <div class="opening">${mdToHtml((issue as any).opening_message)}</div>
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
      ${s.markdown_body ? `<div class="section-body">${mdToHtml(s.markdown_body)}</div>` : ""}
      ${s.content && Object.keys(s.content).length > 0 ? `<div class="section-content">${contentToHtml(s.content)}</div>` : ""}
    </div>
  `).join("")}
</body></html>`

    const browser = await getBrowser()
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
