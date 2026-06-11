"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { assignStaff } from "@/lib/actions/staffing"
import type { CoverageResult } from "@/lib/event-coverage"

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

type CalendarEvent = {
  id: number
  title: string
  description?: string | null
  category?: string | null
  start_time: string
  end_time?: string | null
  required_security?: number | null
  required_ops?: number | null
}

function getEventEndTime(startTimeIso: string, endTimeIso?: string | null) {
  if (endTimeIso) return new Date(endTimeIso)
  return new Date(new Date(startTimeIso).getTime() + 60 * 60 * 1000)
}

type StaffOption = {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  assignable?: boolean
  note?: string
  source?: string
}

export function CalendarEventTimeline({
  events,
  canAssign,
  staff,
  viewerRole,
  assignmentsByEvent,
  coverageByEvent,
}: {
  events: CalendarEvent[]
  canAssign: boolean
  staff: StaffOption[]
  viewerRole?: string | null
  assignmentsByEvent?: Record<string, Record<string, { id: string; name: string; email: string | null }[]>>
  coverageByEvent?: Record<number, CoverageResult>
}) {
  const router = useRouter()
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const firstAssignableId = staff.find((s) => s.assignable !== false)?.id || ""
  const [userId, setUserId] = useState(firstAssignableId)
  const [roleAssigned, setRoleAssigned] = useState("operations")
  const [shiftStart, setShiftStart] = useState("")
  const [shiftEnd, setShiftEnd] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rosterEvent, setRosterEvent] = useState<CalendarEvent | null>(null)
  const [rosterRole, setRosterRole] = useState<string>("security")

  const staffOptions = useMemo(() => {
    return [...staff].sort((a, b) => {
      const aName = (a.full_name || a.email || "").toLowerCase()
      const bName = (b.full_name || b.email || "").toLowerCase()
      return aName.localeCompare(bName)
    })
  }, [staff])

  useEffect(() => {
    if (!userId && staffOptions.length > 0) {
      setUserId(staffOptions[0].id)
    }
  }, [userId, staffOptions])

  const openAssign = (event: CalendarEvent, preRole?: string) => {
    if (!canAssign) return
    setSelectedEvent(event)
    setRoleAssigned(preRole || "operations")
    const start = new Date(event.start_time)
    setShiftStart(new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16))
    setShiftEnd("")
    setMessage(null)
    setError(null)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedUserId = userId.trim()

    if (!selectedEvent) {
      setError("Please choose an event.")
      return
    }

    if (!normalizedUserId) {
      setError("Please choose a staff member.")
      return
    }

    if (selectedEvent.id < 0) {
      setError("This event is a placeholder and cannot be assigned directly. Use the sidebar to create a shift assignment.")
      setSaving(false)
      return
    }

    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await assignStaff(
        selectedEvent.id,
        normalizedUserId,
        roleAssigned,
        shiftStart ? new Date(shiftStart).toISOString() : undefined,
        shiftEnd ? new Date(shiftEnd).toISOString() : undefined,
      )
      setMessage("Assignment saved.")
      router.refresh()
      // Auto-close so the refreshed event card visibly updates.
      setTimeout(() => setSelectedEvent(null), 600)
    } catch (err: any) {
      setError(err?.message || "Failed to save assignment.")
    } finally {
      setSaving(false)
    }
  }

  const openRoster = (event: CalendarEvent, role: string) => {
    setRosterEvent(event)
    setRosterRole(role)
  }

  const rosterForSelectedEvent = rosterEvent
    ? assignmentsByEvent?.[String(rosterEvent.id)]?.[rosterRole] || []
    : []

  return (
    <>
      <div className="space-y-4">
        {events.map((event, idx) => {
          const start = new Date(event.start_time)
          const end = getEventEndTime(event.start_time, event.end_time)
          const startTime = start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          const endTime = end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          const isSpecial = event.category === "major_feast"
          const assignments = assignmentsByEvent?.[String(event.id)] || {}
          const coverage = coverageByEvent?.[event.id]
          // Prefer authoritative coverage (scheduled shifts overlapping the
          // event + explicit add-on assignments). Fall back to raw
          // assignment counts only when coverage isn't supplied.
          const secAssigned = coverage
            ? coverage.counts.security.total
            : (assignments["security"] || []).length
          const opsAssigned = coverage
            ? coverage.counts.operations.total
            : (assignments["operations"] || []).length
          const secRequired = event.required_security ?? 1
          const opsRequired = event.required_ops ?? 1
          const secCovered = coverage
            ? !coverage.gaps.some((g) => g.role === "security")
            : secAssigned >= secRequired
          const opsCovered = coverage
            ? !coverage.gaps.some((g) => g.role === "operations")
            : opsAssigned >= opsRequired
          const overallCovered = coverage ? coverage.covered : (secCovered && opsCovered)
          const desc = event.description ? stripHtml(event.description) : ""

          return (
            <div
              key={idx}
              className={`grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-2xl bg-surface-container-lowest border-l-4 ${isSpecial ? "border-secondary" : "border-primary"} ${canAssign ? "cursor-pointer hover:bg-surface-container" : ""}`}
              onClick={canAssign ? () => openAssign(event) : undefined}
              role={canAssign ? "button" : undefined}
              tabIndex={canAssign ? 0 : -1}
              onKeyDown={(e) => {
                if (!canAssign) return
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  openAssign(event)
                }
              }}
            >
              <div className="md:col-span-2 flex items-center justify-center">
                <span className="font-label text-sm font-bold text-on-surface">{`${startTime} - ${endTime}`}</span>
              </div>

              <div className="md:col-span-10">
                <div className="flex flex-col sm:flex-row justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-headline font-bold text-lg mb-1 ${isSpecial ? "text-secondary" : "text-primary"}`}>
                      {event.title}
                    </h4>
                    {coverage ? (
                      <span
                        className={
                          "inline-flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full mb-1 " +
                          (overallCovered
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-error-container text-on-error-container")
                        }
                        title={
                          overallCovered
                            ? "All required roles covered by schedule + assignments."
                            : "Required roles not fully covered. Extend a shift or assign coverage."
                        }
                      >
                        <span className="material-symbols-outlined text-[12px]">
                          {overallCovered ? "check_circle" : "warning"}
                        </span>
                        {overallCovered ? "Covered" : "Coverage gap"}
                      </span>
                    ) : null}
                    {desc && (
                      <p className="text-xs text-on-surface-variant whitespace-pre-wrap break-words">
                        {desc}
                      </p>
                    )}
                  </div>
                  <div className="mt-2 sm:mt-0 flex gap-2 shrink-0">
                    {canAssign ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openAssign(event, "security")
                          }}
                          className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors ${
                            secCovered
                              ? "bg-secondary-container text-on-secondary-container"
                              : "bg-error-container/40 text-error"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">shield</span>
                          <span className="text-[10px] font-bold">SEC: {secAssigned}/{secRequired}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openAssign(event, "operations")
                          }}
                          className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors ${
                            opsCovered
                              ? "bg-secondary-container text-on-secondary-container"
                              : "bg-error-container/40 text-error"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">settings</span>
                          <span className="text-[10px] font-bold">OPS: {opsAssigned}/{opsRequired}</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openRoster(event, "security")
                          }}
                          className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors ${
                            secCovered
                              ? "bg-secondary-container text-on-secondary-container"
                              : "bg-error-container/40 text-error"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">shield</span>
                          <span className="text-[10px] font-bold">SEC: {secAssigned}/{secRequired}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openRoster(event, "operations")
                          }}
                          className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors ${
                            opsCovered
                              ? "bg-secondary-container text-on-secondary-container"
                              : "bg-error-container/40 text-error"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">settings</span>
                          <span className="text-[10px] font-bold">OPS: {opsAssigned}/{opsRequired}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {selectedEvent ? (
        <div className="fixed inset-0 z-[100] bg-surface/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90svh] overflow-y-auto card-surface rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 hover:bg-surface rounded-full"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-headline text-2xl font-bold text-primary mb-1">Assign Staff to Event</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              {selectedEvent.title} at {new Date(selectedEvent.start_time).toLocaleString()}
              {` - ${getEventEndTime(selectedEvent.start_time, selectedEvent.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </p>

            <form onSubmit={onSubmit} className="space-y-4">
              {staffOptions.length === 0 ? (
                <div className="bg-error-container text-on-error-container text-sm rounded-xl p-3">
                  No staff returned from Supabase. Check `staff_directory` / `profiles` access.
                </div>
              ) : null}

              <div>
                <label className="block text-xs uppercase tracking-widest text-on-surface-variant mb-2">Staff Member</label>
                <select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full input-surface px-4 py-3"
                  disabled={staffOptions.length === 0}
                  required
                >
                  {staffOptions.length === 0 ? (
                    <option value="">No staff found</option>
                  ) : (
                    staffOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {(member.full_name || member.email || `User ${member.id.slice(0, 8)}`)} ({member.role || "staff"})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-on-surface-variant mb-2">Assigned Role</label>
                <select
                  value={roleAssigned}
                  onChange={(e) => setRoleAssigned(e.target.value)}
                  className="w-full input-surface px-4 py-3"
                  required
                >
                  <option value="operations">Operations</option>
                  <option value="security">Security</option>
                  <option value="greeter">Greeter</option>
                  <option value="director">Director</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-on-surface-variant mb-2">Shift Start</label>
                  <input
                    type="datetime-local"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className="w-full input-surface px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-on-surface-variant mb-2">Shift End (optional)</label>
                  <input
                    type="datetime-local"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    className="w-full input-surface px-4 py-3"
                  />
                </div>
              </div>

              {message ? <p className="text-sm text-primary font-medium">{message}</p> : null}
              {error ? <p className="text-sm text-error font-medium">{error}</p> : null}

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setSelectedEvent(null)} className="btn-secondary px-4 py-2">
                  Cancel
                </button>
                <button type="submit" disabled={saving || staffOptions.length === 0} className="btn-primary px-5 py-2 disabled:opacity-50">
                  {saving ? "Saving..." : "Save Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {rosterEvent ? (
        <div className="fixed inset-0 z-[100] bg-surface/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-xl max-h-[90svh] overflow-y-auto card-surface rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setRosterEvent(null)}
              className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 hover:bg-surface rounded-full"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-headline text-2xl font-bold text-primary mb-1">
              {rosterRole.charAt(0).toUpperCase() + rosterRole.slice(1)} Team
            </h3>
            <p className="text-sm text-on-surface-variant mb-6">
              {rosterEvent.title} at {new Date(rosterEvent.start_time).toLocaleString()}
              {` - ${getEventEndTime(rosterEvent.start_time, rosterEvent.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </p>

            {rosterForSelectedEvent.length > 0 ? (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {rosterForSelectedEvent.map((member) => (
                  <div key={member.id} className="bg-surface-container-low rounded-xl p-3">
                    <p className="text-sm font-semibold text-on-surface">{member.name}</p>
                    <p className="text-xs text-on-surface-variant">{member.email || "No email"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-low rounded-xl p-4 text-sm text-on-surface-variant">
                No {rosterRole} staff are currently assigned to this event.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
