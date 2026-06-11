"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { assignStaff, assignDayShift } from "@/lib/actions/staffing"

type EventOption = {
  id: number
  title: string
  start_time: string
  end_time?: string | null
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

const ROLE_OPTIONS = [
  { value: "all", label: "All Staff" },
  { value: "operations", label: "Operations" },
  { value: "security", label: "Security" },
  { value: "greeter", label: "Greeter" },
  { value: "director", label: "Director" },
]

function getEventEndTime(startTimeIso: string, endTimeIso?: string | null) {
  if (endTimeIso) return new Date(endTimeIso)
  return new Date(new Date(startTimeIso).getTime() + 60 * 60 * 1000)
}

export function CalendarControls({
  date,
  role,
  canAssign,
  viewerRole,
  events,
  staff,
  roleRosterByDate,
}: {
  date: string
  role: string
  canAssign: boolean
  viewerRole?: string | null
  events: EventOption[]
  staff: StaffOption[]
  roleRosterByDate: Record<string, { id: string; name: string; email: string | null; assignments: number }[]>
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [eventId, setEventId] = useState<string>("-1")
  const firstAssignableId = staff.find((s) => s.assignable !== false)?.id ?? ""
  const [userId, setUserId] = useState<string>(firstAssignableId)
  const [roleAssigned, setRoleAssigned] = useState<string>("operations")
  const [shiftStart, setShiftStart] = useState("")
  const [shiftEnd, setShiftEnd] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRosterOpen, setIsRosterOpen] = useState(false)
  const [rosterRole, setRosterRole] = useState<string>(role)

  const displayEvents = useMemo(() => {
    if (!events || events.length === 0) {
      return [
        { id: -1, title: "Opening", start_time: "", end_time: "" },
        { id: -2, title: "Closing", start_time: "", end_time: "" },
      ]
    }
    return events
  }, [events])

  const staffOptions = useMemo(() => {
    return [...staff].sort((a, b) => {
      const aName = (a.full_name || a.email || "").toLowerCase()
      const bName = (b.full_name || b.email || "").toLowerCase()
      return aName.localeCompare(bName)
    })
  }, [staff])

  useEffect(() => {
    if (!eventId && events.length > 0) {
      setEventId(String(events[0].id))
    }
  }, [eventId, events])

  useEffect(() => {
    if (!userId && staffOptions.length > 0) {
      setUserId(staffOptions[0].id)
    }
  }, [userId, staffOptions])

  const onRoleChange = (nextRole: string) => {
    const params = new URLSearchParams()
    params.set("date", date)
    params.set("role", nextRole)
    window.location.href = `/calendar?${params.toString()}`

    const normalizedViewerRole = String(viewerRole || "").toLowerCase()
    const shouldShowCrossRoleRoster =
      (normalizedViewerRole === "security" && nextRole === "operations") ||
      (normalizedViewerRole === "operations" && nextRole === "security")

    if (shouldShowCrossRoleRoster) {
      setRosterRole(nextRole)
      setIsRosterOpen(true)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const normalizedUserId = userId.trim()
    const normalizedEventId = eventId.trim()

    if (!normalizedUserId) {
      setError("Please choose a staff member.")
      return
    }

    setSaving(true)
    try {
      if (normalizedEventId === "-1" || normalizedEventId === "-2") {
        const shiftName = normalizedEventId === "-1" ? "Opening" : "Closing"
        await assignDayShift(date, shiftName, normalizedUserId, roleAssigned,
          shiftStart ? new Date(shiftStart).toISOString() : undefined,
          shiftEnd ? new Date(shiftEnd).toISOString() : undefined)
      } else if (normalizedEventId && !Number.isNaN(Number(normalizedEventId))) {
        await assignStaff(
          Number(normalizedEventId),
          normalizedUserId,
          roleAssigned,
          shiftStart ? new Date(shiftStart).toISOString() : undefined,
          shiftEnd ? new Date(shiftEnd).toISOString() : undefined,
        )
      } else {
        setError("Please choose an event.")
        setSaving(false)
        return
      }
      setMessage("Assignment saved.")
      router.refresh()
    } catch (err: any) {
      setError(err?.message || "Failed to save assignment.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <label className="bg-surface-container-low px-4 py-2 rounded-xl text-primary font-semibold hover:bg-surface-container-highest transition-colors flex items-center gap-2 cursor-pointer">
          <span className="material-symbols-outlined text-sm">filter_list</span>
          <select
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            className="bg-transparent outline-none cursor-pointer"
            aria-label="Role filter"
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                Role: {opt.label}
              </option>
            ))}
          </select>
        </label>

        {canAssign ? (
          <>
            <a
              href="/manager/schedule-upload"
              className="bg-surface-container-low px-4 py-2 rounded-xl text-primary font-semibold hover:bg-surface-container-highest transition-colors flex items-center gap-2"
              title="Upload a two-week schedule PDF"
            >
              <span className="material-symbols-outlined text-sm">upload_file</span>
              Upload Schedule PDF
            </a>
            <button
              className="byzantine-gradient text-white px-6 py-2 rounded-xl font-bold shadow-lg flex items-center gap-2"
              onClick={() => setIsOpen(true)}
              title="Create assignment"
            >
              <span className="material-symbols-outlined">add</span>
              New Assignment
            </button>
          </>
        ) : null}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] bg-surface/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90svh] overflow-y-auto card-surface rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 hover:bg-surface rounded-full"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-headline text-2xl font-bold text-primary mb-6">Create Staff Assignment</h3>

            <form onSubmit={onSubmit} className="space-y-4">
              {staffOptions.length === 0 ? (
                <div className="bg-error-container text-on-error-container text-sm rounded-xl p-3">
                  No staff returned from Supabase. Check `staff_directory` / `profiles` access and session permissions.
                </div>
              ) : null}

              <div>
                <label className="block text-xs uppercase tracking-widest text-on-surface-variant mb-2">Event</label>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full input-surface px-4 py-3"
                  required
                >
                  {displayEvents.map((event) => (
                    <option key={event.id} value={String(event.id)}>
                      {event.start_time ? `${event.title} (${new Date(event.start_time).toLocaleString()} - ${getEventEndTime(event.start_time, event.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})` : event.title}
                    </option>
                  ))}
                </select>
              </div>

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
                  <label className="block text-xs uppercase tracking-widest text-on-surface-variant mb-2">Shift Start (optional)</label>
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
                <button type="button" onClick={() => setIsOpen(false)} className="btn-secondary px-4 py-2">
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

      {isRosterOpen ? (
        <div className="fixed inset-0 z-[100] bg-surface/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-xl max-h-[90svh] overflow-y-auto card-surface rounded-[1.5rem] sm:rounded-[2rem] p-5 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setIsRosterOpen(false)}
              className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 hover:bg-surface rounded-full"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <h3 className="font-headline text-2xl font-bold text-primary mb-1">
              {rosterRole.charAt(0).toUpperCase() + rosterRole.slice(1)} Coverage
            </h3>
            <p className="text-sm text-on-surface-variant mb-6">
              Assigned team members for {new Date(`${date}T12:00:00`).toLocaleDateString()}.
            </p>

            {(roleRosterByDate?.[rosterRole] || []).length > 0 ? (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {(roleRosterByDate?.[rosterRole] || []).map((member) => (
                  <div key={member.id} className="bg-surface-container-low rounded-xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{member.name}</p>
                      <p className="text-xs text-on-surface-variant">{member.email || "No email"}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full bg-primary-fixed text-on-primary-fixed">
                      {member.assignments} {member.assignments === 1 ? "assignment" : "assignments"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-surface-container-low rounded-xl p-4 text-sm text-on-surface-variant">
                No {rosterRole} staff assignments found for this date.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
