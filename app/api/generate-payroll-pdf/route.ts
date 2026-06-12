import { NextRequest, NextResponse } from "next/server"
import { createAdminClient, createServerClient } from "@/utils/supabase/server"
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

export async function POST(request: NextRequest) {
  try {
    // Require authenticated manager — payroll data is sensitive
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const adminAuth = createAdminClient()
    const { data: callerProfile } = await adminAuth
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    if (!callerProfile || !["manager", "admin"].includes(callerProfile.role)) {
      return NextResponse.json({ error: "Manager role required" }, { status: 403 })
    }

    const body = await request.json()
    const { reportId, html: rawHtml } = body

    let html = rawHtml
    let filename = "payroll-report.pdf"

    if (reportId && !html) {
      const admin = createAdminClient()
      const { data: report } = await admin
        .from("payroll_reports")
        .select("*")
        .eq("id", reportId)
        .single()

      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 })
      }

      const content = report.content as any
      const dayHeaders = content.staffRows?.[0]?.dailyHours.map((d: any) => {
        const date = new Date(d.date + "T12:00:00")
        return `<th style="padding:8px 4px;font-size:11px;text-align:center;border-bottom:2px solid #1a3a5c;background:#f8f9fa;">${date.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })}</th>`
      }).join("") || ""

      const rows = (content.staffRows || []).map((row: any) => {
        const dayCells = row.dailyHours.map((d: any) =>
          `<td style="padding:6px 4px;text-align:center;font-size:12px;border-bottom:1px solid #e9ecef;">${d.hours > 0 ? d.hours.toFixed(2) : "—"}</td>`
        ).join("")

        return `
          <tr>
            <td style="padding:6px 8px;font-weight:600;font-size:12px;border-bottom:1px solid #e9ecef;white-space:nowrap;">${row.name}</td>
            <td style="padding:6px 8px;font-size:11px;text-transform:uppercase;color:#666;border-bottom:1px solid #e9ecef;">${row.role}</td>
            <td style="padding:6px 8px;text-align:right;font-size:12px;border-bottom:1px solid #e9ecef;">$${row.hourlyRate.toFixed(2)}</td>
            ${dayCells}
            <td style="padding:6px 8px;text-align:right;font-weight:700;font-size:12px;border-bottom:1px solid #e9ecef;background:#f8f9fa;">${row.totalHours.toFixed(2)}</td>
            <td style="padding:6px 8px;text-align:right;font-weight:700;font-size:12px;border-bottom:1px solid #e9ecef;background:#f8f9fa;">$${row.grossPay.toFixed(2)}</td>
          </tr>
        `
      }).join("")

      html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Payroll Report — ${content.period?.label || report.title}</title>
<style>
  @page { size: landscape; margin: 0.5in; }
  body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; color: #1a1a1a; line-height: 1.4; }
  h1 { font-size: 1.6rem; border-bottom: 3px solid #1a3a5c; padding-bottom: 0.5rem; margin-bottom: 0.5rem; }
  .meta { color: #666; font-size: 0.8rem; margin-bottom: 1rem; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .summary { display: flex; gap: 1rem; margin: 1rem 0; }
  .summary-box { background: #f5f5f5; border-radius: 6px; padding: 0.75rem 1rem; text-align: center; flex: 1; }
  .summary-label { font-size: 0.6rem; text-transform: uppercase; color: #666; font-weight: 700; }
  .summary-value { font-size: 1.2rem; font-weight: 900; }
  footer { margin-top: 2rem; border-top: 1px solid #e0e0e0; padding-top: 1rem; font-size: 0.7rem; color: #666; text-align: center; }
</style></head>
<body>
  <img src="${process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')}/images/logo-color.jpg" alt="Saint Nicholas Shrine" style="display:block;height:56px;width:auto;margin:0 0 12px;" />
  <div class="meta">${content.period?.label || ""} &bull; Generated ${new Date(content.generatedAt || report.created_at).toLocaleString()}</div>
  <h1>Payroll Report — ${content.period?.label || report.title}</h1>
  <div class="summary">
    <div class="summary-box">
      <div class="summary-label">Staff Members</div>
      <div class="summary-value">${content.staffRows?.length || 0}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Total Hours</div>
      <div class="summary-value">${(content.grandTotalHours || 0).toFixed(2)}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Total Payroll</div>
      <div class="summary-value">$${(content.grandTotalPay || 0).toFixed(2)}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="padding:8px;text-align:left;border-bottom:2px solid #1a3a5c;background:#f8f9fa;">Staff</th>
        <th style="padding:8px;text-align:left;border-bottom:2px solid #1a3a5c;background:#f8f9fa;">Role</th>
        <th style="padding:8px;text-align:right;border-bottom:2px solid #1a3a5c;background:#f8f9fa;">Rate</th>
        ${dayHeaders}
        <th style="padding:8px;text-align:right;border-bottom:2px solid #1a3a5c;background:#f8f9fa;">Total Hrs</th>
        <th style="padding:8px;text-align:right;border-bottom:2px solid #1a3a5c;background:#f8f9fa;">Gross Pay</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <footer>
    <p><strong>Shrine Operations Payroll Report</strong></p>
    <p>Source of Truth: Operations App &bull; Supabase Records</p>
  </footer>
</body></html>`

      filename = `${report.slug}.pdf`
    }

    if (!html) {
      return NextResponse.json({ error: "html or reportId required" }, { status: 400 })
    }

    const browser = await getBrowser()
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "load" })

    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: true,
      printBackground: true,
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
    })

    await browser.close()

    // Upload to storage
    const admin = createAdminClient()
    const { data: uploadData, error: uploadError } = await admin.storage
      .from("operations-brief-public")
      .upload(`payroll/${filename}`, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: publicUrl } = admin.storage
      .from("operations-brief-public")
      .getPublicUrl(`payroll/${filename}`)

    return NextResponse.json({ pdfUrl: publicUrl?.publicUrl || null, filename })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
