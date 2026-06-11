"use client"

import { useMemo, useRef, useState } from "react"
import { commitUploadedSchedule, createEventFromUnmatchedHeader, type UploadedShift, type UploadedDayHeader, type CommitResult } from "@/lib/actions/schedule-upload"

type ParsedShift = {
  date: string
  staffName: string
  scheduleRole: string
  shiftStart: string | null
  shiftEnd: string | null
  isLate: boolean
}

type ParsedDayHeader = {
  date: string
  dayTitle: string
}

type ParseResponse = {
  shifts: ParsedShift[]
  dayHeaders: ParsedDayHeader[]
  warnings: string[]
  rawText?: string
}

const ROLE_OPTIONS = ["DIRECTOR", "PORTER", "GREETER", "SECURITY"]

function formatDateHeader(date: string): string {
  const d = new Date(date + "T12:00:00")
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function formatShiftCell(s: ParsedShift): string {
  if (!s.shiftStart && !s.shiftEnd) return "OFF"
  return `${s.shiftStart || "?"} – ${s.shiftEnd || "?"}`
}

export function ScheduleUploadClient() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParseResponse | null>(null)
  const [result, setResult] = useState<CommitResult | null>(null)
  // Per-unmatched-header state for the "Add to calendar" buttons on the result screen.
  const [addingKey, setAddingKey] = useState<string | null>(null)
  const [addedKeys, setAddedKeys] = useState<Record<string, string>>({})
  const [addError, setAddError] = useState<Record<string, string>>({})

  // Editable state (mirrors parsed.shifts and parsed.dayHeaders)
  const [editShifts, setEditShifts] = useState<ParsedShift[]>([])
  const [editHeaders, setEditHeaders] = useState<ParsedDayHeader[]>([])

  // Input mode
  const [mode, setMode] = useState<"file" | "paste">("file")
  const [pastedText, setPastedText] = useState("")

  async function handleParseResponse(res: Response, label: string) {
    const json = await res.json()
    if (!res.ok) {
      const detail = json.detail ? ` — ${json.detail}` : ""
      setError((json.error || "Parse failed") + detail)
      setParsed(null)
      return
    }
    setFileName(label)
    setParsed(json)
    setEditShifts(json.shifts || [])
    setEditHeaders(json.dayHeaders || [])
  }

  async function handlePasteSubmit() {
    if (!pastedText.trim()) return
    setError(null)
    setResult(null)
    setParsing(true)
    try {
      const fd = new FormData()
      fd.append("pasted", pastedText)
      const res = await fetch("/api/schedule/parse", { method: "POST", body: fd })
      await handleParseResponse(res, "Pasted from clipboard")
    } catch (err: any) {
      setError(err?.message || "Paste parse failed")
    } finally {
      setParsing(false)
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setError(null)
    setResult(null)
    setFileName(f.name)
    setParsing(true)
    try {
      const fd = new FormData()
      fd.append("file", f)
      const res = await fetch("/api/schedule/parse", { method: "POST", body: fd })
      await handleParseResponse(res, f.name)
    } catch (err: any) {
      setError(err?.message || "Upload failed")
    } finally {
      setParsing(false)
    }
  }

  function updateShift(idx: number, patch: Partial<ParsedShift>) {
    setEditShifts((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  function updateHeader(idx: number, dayTitle: string) {
    setEditHeaders((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], dayTitle }
      return next
    })
  }

  async function handleCommit() {
    if (editShifts.length === 0) return
    setCommitting(true)
    setError(null)
    try {
      const payloadShifts: UploadedShift[] = editShifts.map((s) => ({
        date: s.date,
        staffName: s.staffName,
        scheduleRole: s.scheduleRole,
        shiftStart: s.shiftStart,
        shiftEnd: s.shiftEnd,
      }))
      const payloadHeaders: UploadedDayHeader[] = editHeaders.map((h) => ({
        date: h.date,
        dayTitle: h.dayTitle,
      }))
      const r = await commitUploadedSchedule(payloadShifts, payloadHeaders)
      setResult(r)
    } catch (err: any) {
      setError(err?.message || "Commit failed")
    } finally {
      setCommitting(false)
    }
  }

  function resetAll() {
    setParsed(null)
    setEditShifts([])
    setEditHeaders([])
    setFileName(null)
    setResult(null)
    setError(null)
    setPastedText("")
    setMode("file")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Group shifts: rows = staff, columns = date
  const { dates, staffNames, byKey } = useMemo(() => {
    const dateSet = new Set<string>()
    const nameSet = new Set<string>()
    const map = new Map<string, ParsedShift>()
    for (const s of editShifts) {
      dateSet.add(s.date)
      nameSet.add(s.staffName)
      map.set(`${s.staffName}|${s.date}`, s)
    }
    return {
      dates: Array.from(dateSet).sort(),
      staffNames: Array.from(nameSet),
      byKey: map,
    }
  }, [editShifts])

  // Result screen
  if (result) {
    // First date covered by this upload — used to jump straight to the right
    // week on the calendar. Otherwise users default to today's week and the
    // newly uploaded (often future) dates look invisible.
    const uploadedDates = Array.from(new Set(editShifts.map((s) => s.date))).sort()
    const firstDate = uploadedDates[0]
    return (
      <div className="space-y-6">
        <div className="bg-surface-container-low rounded-2xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-green-500">check_circle</span>
            <h2 className="font-headline text-2xl text-on-surface">Schedule published</h2>
          </div>
          <ul className="text-sm text-on-surface-variant space-y-1">
            <li>· {result.datesProcessed} day(s) processed</li>
            <li>· {result.dailyShiftsInserted} daily shift assignments written</li>
            <li>· {result.eventAssignmentsInserted} event-coverage assignments written</li>
          </ul>

          {result.matchedEvents.length > 0 && (
            <div>
              <p className="font-semibold text-on-surface mb-2">Matched events:</p>
              <ul className="text-sm text-on-surface-variant space-y-1">
                {result.matchedEvents.map((m) => (
                  <li key={m.eventId}>
                    · <strong>{m.eventTitle}</strong> on {formatDateHeader(m.date)} — {m.assigned} staff assigned
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.unmatchedHeaders.length > 0 && (
            <div>
              <p className="font-semibold text-on-surface mb-2">No matching calendar event for:</p>
              <ul className="text-sm text-on-surface-variant space-y-2">
                {result.unmatchedHeaders.map((u, i) => {
                  const key = `${u.date}|${u.dayTitle}`
                  const added = addedKeys[key]
                  const err = addError[key]
                  const busy = addingKey === key
                  return (
                    <li key={i} className="flex flex-wrap items-center gap-2">
                      <span>· {formatDateHeader(u.date)}: &quot;{u.dayTitle}&quot;</span>
                      {added ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                          <span className="material-symbols-outlined text-base">check_circle</span>
                          Added ({added})
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            setAddingKey(key)
                            setAddError((prev) => {
                              const { [key]: _omit, ...rest } = prev
                              return rest
                            })
                            try {
                              const res = await createEventFromUnmatchedHeader({ date: u.date, dayTitle: u.dayTitle })
                              setAddedKeys((prev) => ({ ...prev, [key]: res.alreadyExisted ? `existing #${res.eventId}` : `#${res.eventId}` }))
                            } catch (e: any) {
                              setAddError((prev) => ({ ...prev, [key]: e?.message || String(e) }))
                            } finally {
                              setAddingKey(null)
                            }
                          }}
                          className="text-xs font-semibold px-2 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                        >
                          {busy ? "Adding\u2026" : "Add to calendar"}
                        </button>
                      )}
                      {err && (
                        <span className="text-xs text-red-600 dark:text-red-400">{err}</span>
                      )}
                    </li>
                  )
                })}
              </ul>
              <p className="text-xs text-on-surface-variant mt-2">
                Tip: add these events to Google Calendar so future uploads auto-assign coverage.
              </p>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-sm p-3 rounded-xl">
              <strong>Warnings:</strong>
              <ul className="mt-1 space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i}>· {w}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 pt-2 flex-wrap">
            {firstDate && (
              <a
                href={`/calendar?date=${firstDate}`}
                className="px-5 py-2 rounded-xl font-semibold text-white"
                style={{ background: "linear-gradient(135deg, var(--primary) 0%, #1a4d8c 100%)" }}
              >
                View on calendar ({formatDateHeader(firstDate)})
              </a>
            )}
            <button
              onClick={resetAll}
              className="px-5 py-2 rounded-xl font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high"
            >
              Upload another schedule
            </button>
            <a
              href="/manager"
              className="px-5 py-2 rounded-xl font-semibold text-on-surface bg-surface-container hover:bg-surface-container-high"
            >
              Back to command center
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Pre-parse screen: tabbed input (File | Paste from Google Sheets)
  if (!parsed) {
    return (
      <div className="bg-surface-container-low rounded-2xl p-6 sm:p-10 space-y-5">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-outline-variant">
          <button
            onClick={() => { setMode("file"); setError(null) }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              mode === "file"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Upload file
          </button>
          <button
            onClick={() => { setMode("paste"); setError(null) }}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              mode === "paste"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Paste from Google Sheets / Excel
          </button>
          <div className="flex-1" />
          <a
            href="/api/schedule/template"
            download="schedule-template.csv"
            className="px-3 py-2 text-xs font-semibold text-primary hover:underline self-center"
          >
            ↓ Download blank template (.csv)
          </a>
        </div>

        {mode === "file" && (
          <div className="border-2 border-dashed border-outline-variant rounded-xl p-8 sm:p-12 text-center space-y-4">
            <span className="material-symbols-outlined text-6xl text-primary">upload_file</span>
            <div>
              <p className="font-headline text-xl text-on-surface">
                {fileName ? fileName : "Choose schedule file"}
              </p>
              <p className="text-sm text-on-surface-variant mt-1">
                Accepts <strong>PDF</strong> (the weekly emailed schedule),{" "}
                <strong>Excel</strong> (.xlsx, .xls), or <strong>CSV</strong>.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.xlsm,.csv,.tsv,.txt,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              onChange={handleFile}
              disabled={parsing}
              className="block w-full max-w-md mx-auto text-sm text-on-surface
                file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0
                file:text-sm file:font-semibold file:text-white
                file:bg-primary hover:file:opacity-90
                disabled:opacity-50"
            />
            {parsing && <p className="text-sm text-on-surface-variant">Parsing file…</p>}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        {mode === "paste" && (
          <div className="space-y-3">
            <div className="text-sm text-on-surface-variant">
              <p className="mb-1">
                <strong>How to use:</strong> open your schedule in Google Sheets or Excel,
                select all the cells (Ctrl/Cmd+A), copy (Ctrl/Cmd+C),
                then click in the box below and paste (Ctrl/Cmd+V).
              </p>
              <p>Include the row(s) with dates (e.g. <code>6/1/26</code>) and the staff rows beneath them.</p>
            </div>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              disabled={parsing}
              placeholder="Paste your schedule grid here..."
              rows={12}
              className="w-full font-mono text-xs p-3 rounded-xl bg-surface-container text-on-surface border border-outline-variant focus:border-primary focus:outline-none disabled:opacity-50"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-on-surface-variant">
                {pastedText.length.toLocaleString()} chars · {pastedText ? pastedText.split("\n").length : 0} rows
              </p>
              <button
                onClick={handlePasteSubmit}
                disabled={parsing || !pastedText.trim()}
                className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, var(--primary) 0%, #1a4d8c 100%)" }}
              >
                {parsing ? "Parsing…" : "Parse pasted schedule"}
              </button>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        <div className="text-sm text-on-surface-variant space-y-1 pt-2 border-t border-outline-variant">
          <p><strong>What happens next:</strong></p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>You&apos;ll see a preview grid of every parsed shift.</li>
            <li>Edit any cell that&apos;s wrong (the PDF is often messy near OFF days).</li>
            <li>Hit <em>Publish</em> — this becomes the live schedule immediately, replacing prior coverage for these dates.</li>
            <li>Recognised events (Bible Study, Baptism, etc.) get auto-staffed using the shift overlap rules.</li>
          </ol>
        </div>
      </div>
    )
  }

  // Preview / edit screen
  const warnings = parsed.warnings || []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-on-surface-variant">{fileName}</p>
          <p className="text-xs text-on-surface-variant">
            {staffNames.length} staff · {dates.length} days · {editShifts.filter((s) => s.shiftStart).length} shifts
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetAll}
            disabled={committing}
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-surface-container text-on-surface hover:bg-surface-container-high disabled:opacity-50"
          >
            Discard
          </button>
          <button
            onClick={handleCommit}
            disabled={committing || editShifts.length === 0}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, var(--primary) 0%, #1a4d8c 100%)" }}
          >
            {committing ? "Publishing…" : "Publish as live schedule"}
          </button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 text-sm p-3 rounded-xl">
          <strong>Parser warnings:</strong>
          <ul className="mt-1 space-y-1">
            {warnings.map((w, i) => (
              <li key={i}>· {w}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="bg-red-100 dark:bg-red-950/40 text-red-900 dark:text-red-200 text-sm p-3 rounded-xl">
          {error}
        </div>
      )}

      {parsed?.rawText && (
        <details className="bg-surface-container-low rounded-2xl p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-on-surface">
            Debug: raw text extracted from PDF ({parsed.rawText.length} chars)
          </summary>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(parsed.rawText || "")}
              className="px-3 py-1 rounded-lg bg-primary text-white text-xs font-semibold"
            >
              Copy raw text
            </button>
          </div>
          <pre className="mt-3 p-3 bg-black/30 text-on-surface-variant text-xs whitespace-pre-wrap break-words rounded-lg max-h-96 overflow-auto">
            {parsed.rawText}
          </pre>
        </details>
      )}

      {/* Day-header (event) editor */}
      <section className="bg-surface-container-low rounded-2xl p-5 sm:p-6 space-y-3">
        <h2 className="font-headline text-lg text-on-surface">Day labels / events</h2>
        <p className="text-xs text-on-surface-variant">
          Words like &quot;Baptism&quot;, &quot;Concert&quot; or &quot;Bible Study&quot; here are matched to calendar events to auto-assign coverage.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {editHeaders.map((h, idx) => (
            <div key={`${h.date}-${idx}`} className="space-y-1">
              <label className="text-xs font-semibold text-on-surface-variant">
                {formatDateHeader(h.date)}
              </label>
              <input
                type="text"
                value={h.dayTitle}
                onChange={(e) => updateHeader(idx, e.target.value)}
                placeholder="(no event)"
                className="w-full px-3 py-2 rounded-lg bg-surface-container text-sm text-on-surface border border-outline-variant"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Shift grid */}
      <section className="bg-surface-container-low rounded-2xl p-3 sm:p-5">
        <h2 className="font-headline text-lg text-on-surface mb-3 px-2">Shift preview</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-2 font-semibold text-on-surface-variant sticky left-0 bg-surface-container-low">
                  Staff
                </th>
                <th className="text-left p-2 font-semibold text-on-surface-variant">Role</th>
                {dates.map((d) => (
                  <th key={d} className="text-left p-2 font-semibold text-on-surface-variant whitespace-nowrap">
                    {formatDateHeader(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staffNames.map((name) => {
                // Use the first shift to surface the scheduleRole for the row
                const sample = editShifts.find((s) => s.staffName === name)
                return (
                  <tr key={name} className="border-t border-outline-variant">
                    <td className="p-2 font-semibold text-on-surface sticky left-0 bg-surface-container-low">
                      {name}
                    </td>
                    <td className="p-2">
                      <select
                        value={sample?.scheduleRole || "PORTER"}
                        onChange={(e) => {
                          // Update role on every shift for this staff
                          setEditShifts((prev) =>
                            prev.map((s) =>
                              s.staffName === name ? { ...s, scheduleRole: e.target.value } : s
                            )
                          )
                        }}
                        className="px-2 py-1 rounded bg-surface-container text-on-surface border border-outline-variant text-xs"
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    {dates.map((d) => {
                      const s = byKey.get(`${name}|${d}`)
                      const idx = s ? editShifts.indexOf(s) : -1
                      if (!s || idx < 0) {
                        return <td key={d} className="p-2 text-on-surface-variant">—</td>
                      }
                      const isOff = !s.shiftStart && !s.shiftEnd
                      return (
                        <td key={d} className="p-1 align-top">
                          <div className="flex flex-col gap-1">
                            <label className="flex items-center gap-1 text-[10px] text-on-surface-variant">
                              <input
                                type="checkbox"
                                checked={isOff}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    updateShift(idx, { shiftStart: null, shiftEnd: null })
                                  } else {
                                    updateShift(idx, { shiftStart: "09:00", shiftEnd: "17:00" })
                                  }
                                }}
                              />
                              OFF
                            </label>
                            {!isOff && (
                              <>
                                <input
                                  type="time"
                                  value={s.shiftStart || ""}
                                  onChange={(e) => updateShift(idx, { shiftStart: e.target.value || null })}
                                  className="px-1 py-0.5 rounded bg-surface-container text-on-surface text-xs border border-outline-variant w-[90px]"
                                />
                                <input
                                  type="time"
                                  value={s.shiftEnd || ""}
                                  onChange={(e) => updateShift(idx, { shiftEnd: e.target.value || null })}
                                  className="px-1 py-0.5 rounded bg-surface-container text-on-surface text-xs border border-outline-variant w-[90px]"
                                />
                              </>
                            )}
                            {!isOff && s.shiftEnd && parseInt(s.shiftEnd.split(":")[0], 10) >= 17 && (
                              <span className="text-[10px] text-amber-500 font-semibold">LATE</span>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3 pb-8">
        <button
          onClick={resetAll}
          disabled={committing}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-surface-container text-on-surface hover:bg-surface-container-high disabled:opacity-50"
        >
          Discard
        </button>
        <button
          onClick={handleCommit}
          disabled={committing || editShifts.length === 0}
          className="px-6 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--primary) 0%, #1a4d8c 100%)" }}
        >
          {committing ? "Publishing…" : "Publish as live schedule"}
        </button>
      </div>
    </div>
  )
}
