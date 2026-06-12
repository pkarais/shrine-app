"use client"

import { useState } from "react"
import { deleteWalkthrough, clearAllWalkthroughs, getWalkthroughDetail, markWalkthroughAsTest } from "@/lib/actions/walkthroughs"
import { WalkthroughArchiveViewer } from "./WalkthroughArchiveViewer"
import { Trash2, AlertTriangle, X, CheckCircle2, XCircle, Archive, Calendar, FlaskConical, Printer } from "lucide-react"

interface WalkthroughItem {
  id: string
  user_id: string | null
  walkthrough_type: string | null
  category: string | null
  completed_at: string | null
  user_name: string | null
}

export function WalkthroughActivity({ initial }: { initial: WalkthroughItem[] }) {
  const [items, setItems] = useState(initial)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [viewDetail, setViewDetail] = useState<any | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [markingTestId, setMarkingTestId] = useState<string | null>(null)

  async function handleViewDetail(id: string) {
    setLoadingId(id)
    try {
      const detail = await getWalkthroughDetail(id)
      setViewDetail(detail)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoadingId(null)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteWalkthrough(id)
      setItems((prev) => prev.filter((w) => w.id !== id))
    } catch (e: any) {
      alert(e.message)
    }
    setConfirmDelete(null)
  }

  async function handleClearAll() {
    try {
      await clearAllWalkthroughs()
      setItems([])
    } catch (e: any) {
      alert(e.message)
    }
    setConfirmClearAll(false)
  }

  async function handleMarkAsTest(id: string) {
    try {
      await markWalkthroughAsTest(id)
      setItems((prev) => prev.filter((w) => w.id !== id))
      setMarkingTestId(null)
    } catch (e: any) {
      alert(e.message)
    }
  }

  function printWalkthroughDetail(detail: any) {
    const fmtDate = (iso: string) =>
      new Date(iso).toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })
    const fmtTime = (iso: string) =>
      new Date(iso).toLocaleTimeString("en-US", {
        timeZone: "America/New_York", hour: "2-digit", minute: "2-digit",
      })
    const printedAt = `${fmtDate(new Date().toISOString())} at ${fmtTime(new Date().toISOString())} ET`

    const checks = detail.checks || {}
    const checksHtml = Object.entries(checks).length > 0
      ? Object.entries(checks).map(([key, passed]) => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #e8e8e8;">
          <span style="font-size:18px;">${passed ? "✅" : "❌"}</span>
          <span style="font-size:13px;text-transform:capitalize;flex:1;">${key.replace(/_/g, " ")}</span>
          <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding:2px 8px;border-radius:4px;background:${passed ? "#155724" : "#721c24"};color:#fff;">${passed ? "PASS" : "FAIL"}</span>
        </div>
      `).join("")
      : "<p style=\"font-size:13px;color:#555;\">No checklist items recorded.</p>"

    const notesHtml = detail.notes
      ? `<div style="margin-top:16px;background:#f8f9fa;border-left:3px solid #002c5e;padding:12px 16px;border-radius:0 8px 8px 0;font-size:13px;line-height:1.6;white-space:pre-wrap;">${detail.notes}</div>`
      : ""

    const mediaHtml = detail.media_urls && detail.media_urls.length > 0
      ? `<div style="margin-top:16px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#002c5e;margin-bottom:8px;">Attachments</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${detail.media_urls.map((url: string, i: number) => `<a href="${url}" target="_blank" style="font-size:12px;color:#002c5e;text-decoration:underline;">Attachment ${i + 1}</a>`).join("")}
        </div>
      </div>`
      : ""

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${detail.walkthrough_type === "opening" ? "Opening" : "Closing"} Walkthrough — ${fmtDate(detail.completed_at)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui,-apple-system,Arial,sans-serif; color: #111; background:#fff; padding:32px; font-size:13px; }
    header { border-bottom:3px solid #002c5e; padding-bottom:16px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-end; }
    .org { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#735c00; margin-bottom:4px; }
    .title { font-size:22px; font-weight:900; color:#002c5e; }
    .ref { font-size:11px; color:#555; text-align:right; line-height:1.7; }
    .badge { display:inline-block; padding:3px 12px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; margin-left:8px; }
    .badge-opening { background:#155724; color:#fff; }
    .badge-closing { background:#002c5e; color:#fff; }
    .badge-facility { background:#735c00; color:#fff; }
    .badge-security { background:#8d0201; color:#fff; }
    section { margin-bottom:24px; }
    h2 { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#002c5e; border-bottom:1px solid #c0c8d8; padding-bottom:6px; margin-bottom:12px; }
    .summary { display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:20px; }
    .summary-box { background:#f8f9fa; border:1px solid #e8e8e8; border-radius:8px; padding:10px 14px; }
    .summary-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#555; margin-bottom:3px; }
    .summary-value { font-size:13px; color:#111; font-weight:600; }
    footer { margin-top:32px; border-top:1px solid #ccc; padding-top:10px; font-size:10px; color:#888; display:flex; justify-content:space-between; }
    @media print { body { padding:16px; } }
  </style>
</head>
<body>
  <header>
    <img src="/images/logo-color.jpg" alt="Saint Nicholas Shrine" style="display:block;height:56px;width:auto;margin:0 0 12px;" />
    <div>
      <p class="org">Saint Nicholas National Shrine — ${detail.category === "security" ? "Security" : "Operations"}</p>
      <p class="title">${detail.walkthrough_type === "opening" ? "Opening" : "Closing"} Walkthrough Report
        <span class="badge badge-${detail.walkthrough_type}">${detail.walkthrough_type}</span>
        <span class="badge badge-${detail.category}">${detail.category}</span>
      </p>
    </div>
    <div class="ref">
      Report ID: ${detail.id.slice(0,8).toUpperCase()}<br/>
      Date: ${fmtDate(detail.completed_at)}<br/>
      Time: ${fmtTime(detail.completed_at)} ET<br/>
      ${detail.user_name ? `Completed by: ${detail.user_name}<br/>` : ""}
      Printed: ${printedAt}<br/>
      CONFIDENTIAL — INTERNAL USE ONLY
    </div>
  </header>

  <div class="summary">
    <div class="summary-box">
      <div class="summary-label">Walkthrough Type</div>
      <div class="summary-value" style="text-transform:capitalize;">${detail.walkthrough_type}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Category</div>
      <div class="summary-value" style="text-transform:capitalize;">${detail.category}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Completed</div>
      <div class="summary-value">${fmtDate(detail.completed_at)} ${fmtTime(detail.completed_at)} ET</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Report ID</div>
      <div class="summary-value">#${detail.id.slice(0,8).toUpperCase()}</div>
    </div>
  </div>

  <section>
    <h2>Checklist Results</h2>
    ${checksHtml}
  </section>

  ${notesHtml}
  ${mediaHtml}

  <footer>
    <span>Saint Nicholas National Shrine — ${detail.category === "security" ? "Security" : "Operations"} Walkthrough</span>
    <span>Printed ${printedAt}</span>
  </footer>
  <script>window.onload = () => window.print()</script>
</body>
</html>`

    const win = window.open("", "_blank", "width=900,height=700")
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups for this site and try again.")
      return
    }
    win.document.write(html)
    win.document.close()
  }

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-on-surface-variant">No walkthroughs completed yet today.</p>
        <button
          onClick={() => setShowArchive(true)}
          className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 font-medium"
        >
          <Archive className="w-3.5 h-3.5" /> View Archive History
        </button>
        {showArchive && (
          <WalkthroughArchiveViewer onClose={() => setShowArchive(false)} />
        )}
      </div>
    )
  }

  return (
    <>
      <div>
        <div className="space-y-4">
          {items.slice(0, 10).map((wt) => (
            <div key={wt.id} className="bg-surface-container rounded-xl p-4 flex items-center justify-between gap-4">
            <button
              className="min-w-0 flex-1 text-left hover:opacity-80 transition-opacity"
              onClick={() => handleViewDetail(wt.id)}
              disabled={loadingId === wt.id}
            >
              <p className="text-sm font-bold text-on-surface capitalize">
                {wt.walkthrough_type || "Walkthrough"} — {wt.category || "facility"}
                {loadingId === wt.id && <span className="ml-2 text-xs font-normal text-on-surface-variant">Loading…</span>}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {wt.completed_at ? new Date(wt.completed_at).toLocaleString() : "N/A"}
              </p>
            </button>
            <div className="flex items-center gap-3 shrink-0">
              {wt.user_name && (
                <p className="text-xs font-semibold text-on-surface">{wt.user_name}</p>
              )}
              {confirmDelete === wt.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(wt.id)}
                    className="text-[10px] px-2 py-1 rounded bg-red-600 text-white font-bold"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="text-[10px] px-2 py-1 rounded bg-surface-container-high text-on-surface-variant"
                  >
                    Cancel
                  </button>
                </div>
              ) : markingTestId === wt.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMarkAsTest(wt.id)}
                    className="text-[10px] px-2 py-1 rounded bg-tertiary text-white font-bold"
                  >
                    Mark test
                  </button>
                  <button
                    onClick={() => setMarkingTestId(null)}
                    className="text-[10px] px-2 py-1 rounded bg-surface-container-high text-on-surface-variant"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMarkingTestId(wt.id)}
                    className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-tertiary transition-colors"
                    title="Mark as test data"
                  >
                    <FlaskConical className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(wt.id)}
                    className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-red-500 transition-colors"
                    title="Delete walkthrough"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-between items-center">
        <button
          onClick={() => setShowArchive(true)}
          className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 font-medium"
        >
          <Archive className="w-3.5 h-3.5" /> Archive History
        </button>

        {confirmClearAll ? (
          <div className="flex items-center gap-2 p-3 bg-red-900/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-red-400 font-bold">Archive today, then clear?</span>
            <button
              onClick={handleClearAll}
              className="text-xs px-3 py-1.5 rounded bg-red-600 text-white font-bold"
            >
              Yes, clear all
            </button>
            <button
              onClick={() => setConfirmClearAll(false)}
              className="text-xs px-3 py-1.5 rounded bg-surface-container-high text-on-surface-variant"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmClearAll(true)}
            className="text-xs text-on-surface-variant hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Clear all
          </button>
        )}
      </div>

      {/* Archive viewer modal */}
      {showArchive && (
        <WalkthroughArchiveViewer onClose={() => setShowArchive(false)} />
      )}
    </div>

    {/* Detail modal */}
    {viewDetail && (
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-16 overflow-y-auto"
        onClick={() => setViewDetail(null)}
      >
        <div
          className="w-full max-w-2xl bg-surface-container-lowest dark:bg-surface-container rounded-2xl shadow-2xl my-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-outline-variant/20">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                Report #{viewDetail.id.slice(0, 8).toUpperCase()}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-on-surface capitalize">
                  {viewDetail.walkthrough_type || "Walkthrough"}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  viewDetail.walkthrough_type === "opening"
                    ? "bg-primary/10 text-primary"
                    : "bg-secondary/10 text-secondary"
                }`}>
                  {viewDetail.walkthrough_type}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  viewDetail.category === "security"
                    ? "bg-tertiary-container text-on-tertiary-container"
                    : "bg-surface-container-high text-on-surface-variant"
                }`}>
                  {viewDetail.category}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                {viewDetail.completed_at ? new Date(viewDetail.completed_at).toLocaleString("en-US", {
                  timeZone: "America/New_York",
                  weekday: "short", year: "numeric", month: "short", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                }) : "N/A"}
                {viewDetail.user_name ? ` · ${viewDetail.user_name}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <button
                onClick={() => printWalkthroughDetail(viewDetail)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors text-sm font-medium"
                title="Print this report"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={() => setViewDetail(null)}
                className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5 text-sm">
            {/* Checklist */}
            {viewDetail.checks && Object.keys(viewDetail.checks).length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-3">
                  Checklist Results
                </p>
                <div className="space-y-2">
                  {Object.entries(viewDetail.checks as Record<string, boolean>).map(([key, passed]) => (
                    <div key={key} className="flex items-center gap-3 p-3 bg-surface-container rounded-xl">
                      {passed ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                      )}
                      <span className="text-sm text-on-surface capitalize flex-1">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {passed ? "Pass" : "Fail"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {viewDetail.notes && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                  Notes
                </p>
                <div className="bg-surface-container rounded-xl p-4 text-on-surface leading-relaxed whitespace-pre-wrap border-l-4 border-primary">
                  {viewDetail.notes}
                </div>
              </div>
            )}

            {/* Media */}
            {viewDetail.media_urls && viewDetail.media_urls.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">
                  Attachments
                </p>
                <div className="flex flex-wrap gap-2">
                  {viewDetail.media_urls.map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-surface-container text-primary text-xs font-medium hover:bg-surface-container-high transition-colors"
                    >
                      Attachment {i + 1}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  )
}
