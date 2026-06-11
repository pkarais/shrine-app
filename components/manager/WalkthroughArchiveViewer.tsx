"use client"

import { useState, useTransition } from "react"
import { getArchivedWalkthroughs, getArchivedWalkthroughDates, purgeTestWalkthroughs } from "@/lib/actions/walkthroughs"
import { Calendar, X, Printer, ChevronDown, ChevronUp, CheckCircle2, XCircle, Archive, Filter, Trash2, AlertTriangle } from "lucide-react"

interface ArchivedWalkthrough {
  id: string
  original_id: string
  user_id: string | null
  event_id: number | null
  category: string
  walkthrough_type: string
  checks: Record<string, boolean> | null
  notes: string | null
  media_urls: string[] | null
  completed_at: string
  archived_at: string
  user_name: string | null
  is_test: boolean | null
}

interface Props {
  onClose: () => void
}

export function WalkthroughArchiveViewer({ onClose }: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().slice(0, 10)
  })
  const [typeFilter, setTypeFilter] = useState<"all" | "opening" | "closing">("all")
  const [categoryFilter, setCategoryFilter] = useState<"all" | "facility" | "security">("all")
  const [includeTest, setIncludeTest] = useState(false)
  const [items, setItems] = useState<ArchivedWalkthrough[]>([])
  const [pending, startTransition] = useTransition()
  const [selectedItem, setSelectedItem] = useState<ArchivedWalkthrough | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [datesPending, startDatesTransition] = useTransition()
  const [hasSearched, setHasSearched] = useState(false)
  const [confirmPurge, setConfirmPurge] = useState(false)
  const [purgePending, startPurge] = useTransition()

  // Load available dates on mount
  const loadDates = () => {
    startDatesTransition(async () => {
      try {
        const dates = await getArchivedWalkthroughDates(60)
        setAvailableDates(dates)
      } catch (err) {
        console.error("Failed to load archive dates", err)
      }
    })
  }

  const handleSearch = () => {
    setHasSearched(true)
    startTransition(async () => {
      try {
        const type = typeFilter === "all" ? undefined : typeFilter
        const category = categoryFilter === "all" ? undefined : categoryFilter
        const results = await getArchivedWalkthroughs(selectedDate, type, category, includeTest)
        setItems(results)
      } catch (err: any) {
        alert(err?.message || "Failed to load archived walkthroughs")
      }
    })
  }

  const handlePurgeTest = () => {
    setConfirmPurge(false)
    startPurge(async () => {
      try {
        const result = await purgeTestWalkthroughs()
        alert(`Purged ${result.purged} test walkthrough(s) from the archive.`)
        handleSearch()
      } catch (err: any) {
        alert(err?.message || "Failed to purge test data")
      }
    })
  }

  const printWalkthrough = (wt: ArchivedWalkthrough) => {
    const fmtDate = (iso: string) =>
      new Date(iso).toLocaleDateString("en-US", {
        timeZone: "America/New_York",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    const fmtTime = (iso: string) =>
      new Date(iso).toLocaleTimeString("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        minute: "2-digit",
      })
    const printedAt = `${fmtDate(new Date().toISOString())} at ${fmtTime(new Date().toISOString())} ET`

    const checks = wt.checks || {}
    const checksHtml = Object.entries(checks).length > 0
      ? Object.entries(checks).map(([key, passed]) => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #e0e0e0;">
          <span style="font-size:16px;">${passed ? "✅" : "❌"}</span>
          <span style="font-size:13px;text-transform:capitalize;">${key.replace(/_/g, " ")}</span>
          <span style="margin-left:auto;font-size:11px;font-weight:700;color:${passed ? "#155724" : "#721c24"}">${passed ? "PASS" : "FAIL"}</span>
        </div>
      `).join("")
      : "<p style=\"font-size:13px;color:#555;\">No checklist items recorded.</p>"

    const notesHtml = wt.notes
      ? `<div style="margin-top:16px;background:#f7f8fa;border-left:3px solid #002c5e;padding:10px 14px;border-radius:0 8px 8px 0;font-size:13px;line-height:1.6;white-space:pre-wrap;">${wt.notes}</div>`
      : ""

    const mediaHtml = wt.media_urls && wt.media_urls.length > 0
      ? `<div style="margin-top:16px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#002c5e;margin-bottom:8px;">Attachments</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${wt.media_urls.map((url, i) => `<a href="${url}" target="_blank" style="font-size:12px;color:#002c5e;text-decoration:underline;">Attachment ${i + 1}</a>`).join("")}
        </div>
      </div>`
      : ""

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${wt.walkthrough_type === "opening" ? "Opening" : "Closing"} Walkthrough — ${fmtDate(wt.completed_at)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui,-apple-system,Arial,sans-serif; color: #111; background:#fff; padding:32px; font-size:13px; }
    header { border-bottom:3px solid #002c5e; padding-bottom:16px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-end; }
    .org { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#735c00; margin-bottom:4px; }
    .title { font-size:20px; font-weight:900; color:#002c5e; }
    .ref { font-size:11px; color:#555; text-align:right; line-height:1.7; }
    .badge { display:inline-block; padding:2px 10px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; margin-left:8px; }
    .badge-opening { background:#155724; color:#fff; }
    .badge-closing { background:#002c5e; color:#fff; }
    section { margin-bottom:20px; }
    h2 { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:#002c5e; border-bottom:1px solid #c0c8d8; padding-bottom:4px; margin-bottom:10px; }
    .row { display:flex; gap:24px; margin-bottom:6px; }
    .field { flex:1; }
    .label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#555; margin-bottom:2px; }
    .value { font-size:13px; color:#111; }
    footer { margin-top:32px; border-top:1px solid #ccc; padding-top:10px; font-size:10px; color:#888; display:flex; justify-content:space-between; }
    @media print { body { padding:16px; } }
  </style>
</head>
<body>
  <header>
    <div>
      <p class="org">Saint Nicholas National Shrine — ${wt.category === "security" ? "Security" : "Operations"}</p>
      <p class="title">${wt.walkthrough_type === "opening" ? "Opening" : "Closing"} Walkthrough Report
        <span class="badge badge-${wt.walkthrough_type}">${wt.walkthrough_type}</span>
      </p>
    </div>
    <div class="ref">
      Report ID: ${wt.original_id.slice(0,8).toUpperCase()}<br/>
      Date: ${fmtDate(wt.completed_at)}<br/>
      Time: ${fmtTime(wt.completed_at)} ET<br/>
      Completed by: ${wt.user_name || "Unknown"}<br/>
      Printed: ${printedAt}<br/>
      CONFIDENTIAL — INTERNAL USE ONLY
    </div>
  </header>

  <section>
    <h2>Checklist</h2>
    ${checksHtml}
  </section>

  ${notesHtml}
  ${mediaHtml}

  <footer>
    <span>Saint Nicholas National Shrine — ${wt.category === "security" ? "Security" : "Operations"} Walkthrough</span>
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

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-16 overflow-y-auto">
      <div className="w-full max-w-3xl bg-surface-container-lowest dark:bg-surface-container rounded-2xl shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-outline-variant/20">
          <div>
            <h2 className="text-xl font-bold text-on-surface">Walkthrough Archive</h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Browse and print historical opening / closing walkthrough reports
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 space-y-4 border-b border-outline-variant/20">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Date picker */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                onFocus={loadDates}
                className="px-3 py-2 rounded-xl bg-surface-container text-on-surface text-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Type filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Type</label>
              <div className="flex rounded-xl bg-surface-container p-0.5">
                {(["all", "opening", "closing"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                      typeFilter === t
                        ? "bg-surface shadow-sm text-primary"
                        : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Category</label>
              <div className="flex rounded-xl bg-surface-container p-0.5">
                {(["all", "facility", "security"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                      categoryFilter === c
                        ? "bg-surface shadow-sm text-primary"
                        : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSearch}
              disabled={pending}
              className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 ml-auto"
            >
              {pending ? "Loading…" : "Search Archive"}
            </button>
          </div>

          {/* Available dates hint */}
          {availableDates.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Quick dates:</span>
              {availableDates.slice(0, 10).map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors ${
                    selectedDate === d
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {d.slice(5)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {!hasSearched && !pending ? (
            <p className="text-sm text-on-surface-variant text-center py-8">
              Select a date and filters, then click Search Archive to view historical walkthroughs.
            </p>
          ) : pending ? (
            <p className="text-sm text-on-surface-variant text-center py-8">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-8">
              No archived walkthroughs found for {selectedDate}.
            </p>
          ) : (
            <div className="space-y-3">
              {items.map((wt) => (
                <div
                  key={wt.id}
                  className="bg-surface-container rounded-xl p-4 hover:bg-surface-container-high transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          wt.walkthrough_type === "opening"
                            ? "bg-primary/10 text-primary"
                            : "bg-secondary/10 text-secondary"
                        }`}>
                          {wt.walkthrough_type}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          wt.category === "security"
                            ? "bg-tertiary-container text-on-tertiary-container"
                            : "bg-surface-container-high text-on-surface-variant"
                        }`}>
                          {wt.category}
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          {new Date(wt.completed_at).toLocaleTimeString("en-US", {
                            timeZone: "America/New_York",
                            hour: "2-digit",
                            minute: "2-digit",
                          })} ET
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-on-surface mt-1">
                        {wt.user_name || "Unknown staff"}
                      </p>
                      {wt.notes && (
                        <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">{wt.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => printWalkthrough(wt)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors text-xs font-medium"
                        title="Print this report"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print
                      </button>
                      <button
                        onClick={() => setSelectedItem(selectedItem?.id === wt.id ? null : wt)}
                        className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
                        title="View details"
                      >
                        {selectedItem?.id === wt.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {selectedItem?.id === wt.id && (
                    <div className="mt-4 pt-4 border-t border-outline-variant/20">
                      <div className="space-y-1.5">
                        {wt.checks && Object.entries(wt.checks).map(([key, passed]) => (
                          <div key={key} className="flex items-center gap-2">
                            {passed ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                            )}
                            <span className="text-sm text-on-surface capitalize">{key.replace(/_/g, " ")}</span>
                            <span className={`text-[10px] font-bold ml-auto ${passed ? "text-green-600" : "text-red-600"}`}>
                              {passed ? "PASS" : "FAIL"}
                            </span>
                          </div>
                        ))}
                      </div>
                      {wt.notes && (
                        <div className="mt-3 p-3 bg-surface-container-high rounded-xl">
                          <p className="text-[10px] font-bold uppercase text-on-surface-variant mb-1">Notes</p>
                          <p className="text-sm text-on-surface whitespace-pre-wrap">{wt.notes}</p>
                        </div>
                      )}
                      {wt.media_urls && wt.media_urls.length > 0 && (
                        <div className="mt-3">
                          <p className="text-[10px] font-bold uppercase text-on-surface-variant mb-2">Attachments</p>
                          <div className="flex flex-wrap gap-2">
                            {wt.media_urls.map((url, i) => (
                              <a
                                key={i}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary underline hover:text-primary/80"
                              >
                                Attachment {i + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
