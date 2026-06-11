"use client"

import { useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { DayShift } from "@/data/employee-schedules"
import { updateScheduleCell, seedWeekSchedule, copyWeekFromPrevious, type WeekScheduleAssignment } from "@/lib/actions/staffing"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

// Fallback role map — only used when the latest upload snapshot does not
// supply a role for a given staff name (e.g. very old snapshots, or the
// first run before any upload).
const STAFF_ROLES_FALLBACK: Record<string, string> = {
  Paul: "Director", Fabio: "Porter", Josh: "Porter", Paulin: "Porter",
  Demetri: "Greeter", Marcus: "Greeter",
  Teresa: "Security", Ryan: "Security", Ken: "Security", Jose: "Security",
}

const ROLE_ORDER = ["Director", "Porter", "Greeter", "Security", "Operations"]

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":")
  const hr = parseInt(h, 10)
  const ampm = hr >= 12 ? "PM" : "AM"
  const hr12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr
  return `${hr12}:${m} ${ampm}`
}

export function RecurringScheduleCalendar({
  selectedDate,
  weekAssignments = [],
  templateShiftsByDate,
  templateStaffRoles,
  templateSource,
  canEdit = false,
}: {
  selectedDate: string
  weekAssignments?: WeekScheduleAssignment[]
  templateShiftsByDate?: Record<string, DayShift[]>
  templateStaffRoles?: Record<string, string>
  templateSource?: "snapshot" | "static" | "empty"
  canEdit?: boolean
}) {
  const router = useRouter()
  const [editingCell, setEditingCell] = useState<{
    staffName: string
    date: string
    currentStart: string
    currentEnd: string
    currentRole: string
    userId?: string
  } | null>(null)
  const [shiftStart, setShiftStart] = useState("")
  const [shiftEnd, setShiftEnd] = useState("")
  const [editRole, setEditRole] = useState("operations")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedMsg, setSeedMsg] = useState<string | null>(null)
  const [seedErr, setSeedErr] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)
  const [copyMsg, setCopyMsg] = useState<string | null>(null)
  const [copyErr, setCopyErr] = useState<string | null>(null)

  // Combined role map: snapshot-derived staff roles win over the static
  // fallback. This is what drives ordering and the role label column.
  const STAFF_ROLES: Record<string, string> = useMemo(() => {
    return { ...STAFF_ROLES_FALLBACK, ...(templateStaffRoles || {}) }
  }, [templateStaffRoles])

  const { weekDays, scheduleByDate, staffNames } = useMemo(() => {
    const now = new Date(selectedDate + "T12:00:00")
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())

    const days: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      days.push(d.toISOString().split("T")[0])
    }

    // Source: latest upload snapshot (passed in from the server). Days
    // not present in the snapshot map come back as []. No more reads
    // from the hardcoded `data/employee-schedules.ts`.
    const byDate: Record<string, DayShift[]> = {}
    const names = new Set<string>()
    for (const date of days) {
      const list = templateShiftsByDate?.[date] || []
      byDate[date] = list
      for (const s of list) names.add(s.staffName)
    }
    // Always show known staff (from snapshot role map, then fallback) so
    // the grid has rows even on a day everyone is OFF.
    if (templateStaffRoles) {
      for (const name of Object.keys(templateStaffRoles)) names.add(name)
    }
    if (names.size === 0) {
      for (const name of Object.keys(STAFF_ROLES_FALLBACK)) names.add(name)
    }
    return { weekDays: days, scheduleByDate: byDate, staffNames: Array.from(names) }
  }, [selectedDate, templateShiftsByDate, templateStaffRoles])

  // Merge real assignments with static schedule.
  // RULE: any date that has at least one DB assignment is fully owned by the
  // database (uploaded schedule is the source of truth). Static fallback is
  // only used for dates with zero DB activity.
  const mergedScheduleByDate = useMemo(() => {
    const merged: Record<string, Record<string, DayShift>> = {}

    const datesWithDb = new Set(weekAssignments.map((a) => a.date))

    // Static schedule fills in only dates the DB hasn't touched.
    for (const [date, shifts] of Object.entries(scheduleByDate)) {
      if (datesWithDb.has(date)) continue
      merged[date] = {}
      for (const shift of shifts) {
        merged[date][shift.staffName] = shift
      }
    }

    // DB assignments win.
    for (const assignment of weekAssignments) {
      if (!merged[assignment.date]) merged[assignment.date] = {}
      merged[assignment.date][assignment.staffName] = {
        date: assignment.date,
        staffName: assignment.staffName,
        shiftStart: assignment.shiftStart,
        shiftEnd: assignment.shiftEnd,
      }
    }

    return merged
  }, [scheduleByDate, weekAssignments])

  const sortedStaff = useMemo(() => {
    return [...staffNames].sort((a, b) => {
      const ra = ROLE_ORDER.indexOf(STAFF_ROLES[a] || "")
      const rb = ROLE_ORDER.indexOf(STAFF_ROLES[b] || "")
      if (ra !== rb) return ra - rb
      return a.localeCompare(b)
    })
  }, [staffNames, STAFF_ROLES])

  const openEdit = useCallback((staffName: string, date: string) => {
    if (!canEdit) return
    const shift = mergedScheduleByDate[date]?.[staffName]
    const role = STAFF_ROLES[staffName]?.toLowerCase() || "operations"
    const assignment = weekAssignments.find(a => a.date === date && a.staffName === staffName)
    setEditingCell({
      staffName,
      date,
      currentStart: shift?.shiftStart || "",
      currentEnd: shift?.shiftEnd || "",
      currentRole: role,
      userId: assignment?.userId,
    })
    setShiftStart(shift?.shiftStart || "")
    setShiftEnd(shift?.shiftEnd || "")
    setEditRole(role)
    setMessage(null)
    setError(null)
  }, [canEdit, mergedScheduleByDate, weekAssignments])

  const handleSave = async () => {
    if (!editingCell) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await updateScheduleCell(
        editingCell.date,
        editingCell.staffName,
        shiftStart || null,
        shiftEnd || null,
        editRole,
        editingCell.userId
      )
      setMessage("Schedule updated.")
      router.refresh()
      setTimeout(() => setEditingCell(null), 800)
    } catch (err: any) {
      setError(err?.message || "Failed to update schedule.")
    } finally {
      setSaving(false)
    }
  }

  const handleSeedWeek = async () => {
    setSeeding(true)
    setSeedMsg(null)
    setSeedErr(null)
    try {
      const weekStart = weekDays[0]
      const weekEnd = weekDays[6]
      const result = await seedWeekSchedule(weekStart, weekEnd)
      if (result.errors.length > 0) {
        setSeedErr(`Seeded ${result.seeded}, skipped ${result.skipped}. Errors: ${result.errors.slice(0, 3).join("; ")}`)
      } else {
        setSeedMsg(`Seeded ${result.seeded} entries (${result.skipped} already in DB).`)
      }
      router.refresh()
    } catch (err: any) {
      setSeedErr(err?.message || "Seed failed.")
    } finally {
      setSeeding(false)
    }
  }

  const handleCopyFromPrevious = async () => {
    setCopying(true)
    setCopyMsg(null)
    setCopyErr(null)
    try {
      const result = await copyWeekFromPrevious(weekDays[0])
      if (result.errors.length > 0) {
        setCopyErr(`Copied ${result.copied}, skipped ${result.skipped}. Errors: ${result.errors.slice(0, 3).join("; ")}`)
      } else {
        setCopyMsg(`Copied ${result.copied} entries from previous week.`)
      }
      router.refresh()
    } catch (err: any) {
      setCopyErr(err?.message || "Copy failed.")
    } finally {
      setCopying(false)
    }
  }

  const handleMarkOff = async () => {
    if (!editingCell) return
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await updateScheduleCell(
        editingCell.date,
        editingCell.staffName,
        null,
        null,
        editRole,
        editingCell.userId
      )
      setMessage("Marked OFF.")
      router.refresh()
      setTimeout(() => setEditingCell(null), 800)
    } catch (err: any) {
      setError(err?.message || "Failed to mark off.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-surface-container-low rounded-[2rem] overflow-hidden">
      <div className="p-6 pb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="font-headline text-xl font-bold text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">calendar_month</span>
            Staff Schedule
          </h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Weekly schedule view. {canEdit ? "Click any cell to edit shifts." : "Read-only schedule."}
          </p>
          {templateSource && (
            <p className="text-[11px] mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
              <span className="material-symbols-outlined text-[12px]">
                {templateSource === "snapshot" ? "cloud_done" : templateSource === "static" ? "description" : "info"}
              </span>
              {templateSource === "snapshot"
                ? "Template source: latest upload"
                : templateSource === "static"
                  ? "Template source: built-in fallback (no upload yet)"
                  : "Template source: empty"}
            </p>
          )}
          {seedMsg && <p className="text-xs text-primary font-medium mt-1">{seedMsg}</p>}
          {seedErr && <p className="text-xs text-error font-medium mt-1">{seedErr}</p>}
          {copyMsg && <p className="text-xs text-primary font-medium mt-1">{copyMsg}</p>}
          {copyErr && <p className="text-xs text-error font-medium mt-1">{copyErr}</p>}
        </div>
        {canEdit && (
          <div className="flex gap-2 flex-wrap shrink-0">
            <button
              type="button"
              onClick={handleCopyFromPrevious}
              disabled={copying || seeding}
              className="btn-secondary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
              title="Copy last week's schedule into this week (skips cells already edited)"
            >
              <span className="material-symbols-outlined text-base">content_copy</span>
              {copying ? "Copying..." : "Copy Prev Week"}
            </button>
            <button
              type="button"
              onClick={handleSeedWeek}
              disabled={seeding || copying}
              className="btn-secondary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
              title="Apply the most recent uploaded PDF schedule as this week's default (falls back to the static template if no upload has been saved)"
            >
              <span className="material-symbols-outlined text-base">cloud_upload</span>
              {seeding ? "Seeding..." : "Seed From Latest Upload"}
            </button>
          </div>
        )}
      </div>

      {/* Empty week banner — shown when no DB assignments and no static data for this week */}
      {canEdit && weekAssignments.length === 0 && Object.keys(scheduleByDate).length === 0 && (
        <div className="mx-6 mb-4 p-4 bg-surface-container-high rounded-2xl border border-outline-variant/20 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-on-surface-variant">event_note</span>
            <div>
              <p className="text-sm font-medium text-on-surface">No schedule yet for this week.</p>
              <p className="text-xs text-on-surface-variant">Copy last week&apos;s schedule to get started, or click any cell to add individual shifts.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyFromPrevious}
            disabled={copying}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-2 shrink-0 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">content_copy</span>
            {copying ? "Copying..." : "Copy Previous Week"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/15">
              <th className="sticky left-0 bg-surface-container-low z-10 text-left px-4 py-3 font-label text-[11px] uppercase tracking-widest text-on-surface-variant min-w-[120px]">
                Staff / Role
              </th>
              {weekDays.map((dayStr, i) => {
                const d = new Date(dayStr + "T12:00:00")
                const isSelected = dayStr === selectedDate
                return (
                  <th
                    key={i}
                    className={`px-3 py-3 text-center font-label text-[11px] uppercase tracking-widest min-w-[100px] ${isSelected ? "text-primary" : "text-on-surface-variant"}`}
                  >
                    <span className="block">{DAY_LABELS[i]}</span>
                    <span className={`block text-sm font-bold ${isSelected ? "text-primary" : "text-on-surface"}`}>
                      {d.getMonth() + 1}/{d.getDate()}
                    </span>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sortedStaff.map((name) => {
              const role = STAFF_ROLES[name] || ""
              return (
                <tr key={name} className="border-b border-outline-variant/10 hover:bg-surface-container-higher/30 transition-colors">
                  <td className="sticky left-0 bg-surface-container-low z-10 px-4 py-3">
                    <span className="font-headline font-bold text-sm text-on-surface block leading-tight">{name}</span>
                    <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">{role}</span>
                  </td>
                  {weekDays.map((dayStr, i) => {
                    const shift = mergedScheduleByDate[dayStr]?.[name]
                    const isOff = !shift || (shift.shiftStart === null && shift.shiftEnd === null)
                    const isSelected = dayStr === selectedDate
                    // Show "Edited" only when DB value actually differs from static schedule baseline
                    const dbAssignment = weekAssignments.find(a => a.date === dayStr && a.staffName === name)
                    const staticShift = scheduleByDate[dayStr]?.find(s => s.staffName === name)
                    const isEdited = dbAssignment !== undefined && (
                      dbAssignment.shiftStart !== (staticShift?.shiftStart ?? null) ||
                      dbAssignment.shiftEnd !== (staticShift?.shiftEnd ?? null)
                    )
                    // isOverride: any DB record exists (used for styling borders + OFF label)
                    const isOverride = dbAssignment !== undefined

                    if (dayStr === "2026-05-25") {
                      return (
                        <td key={i} className={`px-3 py-3 text-center ${isSelected ? "ring-2 ring-inset ring-primary" : ""}`}>
                          <span className="text-[10px] text-error font-bold uppercase leading-tight block">Closed</span>
                        </td>
                      )
                    }

                    return (
                      <td
                        key={i}
                        onClick={() => openEdit(name, dayStr)}
                        className={`px-3 py-3 text-center align-top transition-colors ${
                          isSelected ? "ring-2 ring-inset ring-primary/30 bg-primary/5" : ""
                        } ${canEdit && !isOff ? "cursor-pointer hover:bg-primary/10" : ""} ${canEdit && isOff ? "cursor-pointer hover:bg-surface-container-high" : ""} ${isEdited ? "border-b-2 border-secondary" : ""}`}
                        title={canEdit ? `Click to edit ${name}'s shift` : undefined}
                      >
                        {isOff ? (
                          <span className={`text-[11px] font-medium ${isOverride ? "text-error font-bold" : "text-on-surface-variant/40"}`}>
                            OFF
                          </span>
                        ) : shift?.shiftStart && shift?.shiftEnd ? (
                          <div className="space-y-0.5">
                            <span className="block text-[13px] font-bold text-on-surface leading-tight">
                              {formatTime(shift.shiftStart)}
                            </span>
                            <span className="block text-[11px] text-on-surface-variant leading-tight">
                              {formatTime(shift.shiftEnd)}
                            </span>
                            {isEdited && (
                              <span className="block text-[9px] text-secondary font-bold uppercase tracking-wider">Edited</span>
                            )}
                          </div>
                        ) : null}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingCell ? (
        <div className="fixed inset-0 z-[100] bg-surface/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-md max-h-[90svh] overflow-y-auto card-surface rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setEditingCell(null)}
              className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 hover:bg-surface rounded-full"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-headline text-2xl font-bold text-primary mb-1">
              Edit Shift
            </h3>
            <p className="text-sm text-on-surface-variant mb-6">
              {editingCell.staffName} — {editingCell.date}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-on-surface-variant mb-2">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full input-surface px-4 py-3"
                >
                  <option value="operations">Operations</option>
                  <option value="security">Security</option>
                  <option value="greeter">Greeter</option>
                  <option value="director">Director</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-on-surface-variant mb-2">Shift Start</label>
                  <input
                    type="time"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className="w-full input-surface px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-on-surface-variant mb-2">Shift End</label>
                  <input
                    type="time"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    className="w-full input-surface px-4 py-3"
                  />
                </div>
              </div>

              {message ? <p className="text-sm text-primary font-medium">{message}</p> : null}
              {error ? <p className="text-sm text-error font-medium">{error}</p> : null}

              <div className="pt-2 flex justify-between items-center gap-3">
                <button
                  type="button"
                  onClick={handleMarkOff}
                  disabled={saving}
                  className="btn-secondary px-4 py-2 text-error"
                >
                  {saving ? "Saving..." : "Mark OFF"}
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingCell(null)}
                    className="btn-secondary px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary px-5 py-2 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Shift"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
