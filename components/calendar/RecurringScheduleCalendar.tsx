"use client"

import { useMemo, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getScheduleForDateRange, type DayShift } from "@/data/employee-schedules"
import { updateScheduleCell, type WeekScheduleAssignment } from "@/lib/actions/staffing"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const STAFF_ROLES: Record<string, string> = {
  Paul: "Director", Fabio: "Porter", Josh: "Porter", Paulin: "Porter",
  Demetri: "Greeter", Marcus: "Greeter",
  Teresa: "Security", Ryan: "Security", Ken: "Security", Jose: "Security",
}

const ROLE_ORDER = ["Director", "Porter", "Greeter", "Security"]

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
  canEdit = false,
}: {
  selectedDate: string
  weekAssignments?: WeekScheduleAssignment[]
  canEdit?: boolean
}) {
  const router = useRouter()
  const [editingCell, setEditingCell] = useState<{
    staffName: string
    date: string
    currentStart: string
    currentEnd: string
    currentRole: string
  } | null>(null)
  const [shiftStart, setShiftStart] = useState("")
  const [shiftEnd, setShiftEnd] = useState("")
  const [editRole, setEditRole] = useState("operations")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

    const allSchedule = getScheduleForDateRange(days[0], days[6])
    const byDate: Record<string, DayShift[]> = {}
    const names = new Set<string>()
    for (const s of allSchedule) {
      if (!byDate[s.date]) byDate[s.date] = []
      byDate[s.date].push(s)
      names.add(s.staffName)
    }
    return { weekDays: days, scheduleByDate: byDate, staffNames: Array.from(names) }
  }, [selectedDate])

  // Merge real assignments with static schedule
  const mergedScheduleByDate = useMemo(() => {
    const merged: Record<string, Record<string, DayShift>> = {}

    // Start with static schedule
    for (const [date, shifts] of Object.entries(scheduleByDate)) {
      merged[date] = {}
      for (const shift of shifts) {
        merged[date][shift.staffName] = shift
      }
    }

    // Overlay real assignments from Supabase
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
  }, [staffNames])

  const openEdit = useCallback((staffName: string, date: string) => {
    if (!canEdit) return
    const shift = mergedScheduleByDate[date]?.[staffName]
    const role = STAFF_ROLES[staffName]?.toLowerCase() || "operations"
    setEditingCell({
      staffName,
      date,
      currentStart: shift?.shiftStart || "",
      currentEnd: shift?.shiftEnd || "",
      currentRole: role,
    })
    setShiftStart(shift?.shiftStart || "")
    setShiftEnd(shift?.shiftEnd || "")
    setEditRole(role)
    setMessage(null)
    setError(null)
  }, [canEdit, mergedScheduleByDate])

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
        editRole
      )
      setMessage("Schedule updated.")
      // Refresh the page to reload server data
      router.refresh()
      setTimeout(() => setEditingCell(null), 800)
    } catch (err: any) {
      setError(err?.message || "Failed to update schedule.")
    } finally {
      setSaving(false)
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
        editRole
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
      <div className="p-6 pb-4">
        <h3 className="font-headline text-xl font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined">calendar_month</span>
          Staff Schedule
        </h3>
        <p className="text-xs text-on-surface-variant mt-1">
          Weekly schedule view. {canEdit ? "Click any cell to override shifts." : "Read-only schedule."}
        </p>
      </div>

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
                    const isOverride = weekAssignments.some(a => a.date === dayStr && a.staffName === name)

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
                        } ${canEdit && !isOff ? "cursor-pointer hover:bg-primary/10" : ""} ${canEdit && isOff ? "cursor-pointer hover:bg-surface-container-high" : ""} ${isOverride ? "border-b-2 border-secondary" : ""}`}
                        title={canEdit ? `Click to edit ${name}'s shift` : undefined}
                      >
                        {isOff ? (
                          <span className={`text-[11px] font-medium ${isOverride ? "text-error font-bold" : "text-on-surface-variant/40"}`}>
                            {isOverride ? "OFF" : "OFF"}
                          </span>
                        ) : shift?.shiftStart && shift?.shiftEnd ? (
                          <div className="space-y-0.5">
                            <span className="block text-[13px] font-bold text-on-surface leading-tight">
                              {formatTime(shift.shiftStart)}
                            </span>
                            <span className="block text-[11px] text-on-surface-variant leading-tight">
                              {formatTime(shift.shiftEnd)}
                            </span>
                            {isOverride && (
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
