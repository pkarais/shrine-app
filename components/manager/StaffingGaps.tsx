"use client"

import { useState, useEffect } from "react"
import { getStaffingGaps, assignStaff } from "@/lib/actions/staffing"
import { getOperationsStaff } from "@/lib/actions/tickets"

export default function StaffingGaps() {
  const [gaps, setGaps] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [availableStaff, setAvailableStaff] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadGaps()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadGaps() {
    try {
      const [data, staff] = await Promise.all([
        getStaffingGaps(),
        getOperationsStaff(),
      ])
      setGaps(data)
      setAvailableStaff(staff)
    } catch {
      setError("Failed to load staffing gaps")
    } finally {
      setLoading(false)
    }
  }

  async function handleAssign(eventId: number, userId: string, role: string) {
    setAssigning(true)
    try {
      await assignStaff(eventId, userId, role)
      setOpenDropdown(null)
      await loadGaps()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAssigning(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-surface-container-low rounded-xl p-8">
        <p className="text-on-surface-variant">Loading staffing gaps...</p>
      </div>
    )
  }

  if (gaps.length === 0) {
    return (
      <div className="bg-surface-container-low rounded-xl p-8 space-y-4">
        <h3 className="font-headline font-bold text-xl text-on-surface">Staffing Gaps</h3>
        <p className="text-on-surface-variant">All upcoming events are fully staffed.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-low rounded-xl p-8 space-y-6">
      <h3 className="font-headline font-bold text-xl text-on-surface">Staffing Gaps</h3>
      {error && (
        <div className="bg-error-container text-on-error-container text-sm p-4 rounded-xl">{error}</div>
      )}
      <div className="space-y-4">
        {gaps.map((gap: any, idx: number) => (
          <div
            key={gap.eventId}
            className="p-4 rounded-xl border-2 border-dashed border-tertiary bg-tertiary-container/20"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-headline font-bold text-on-surface">{gap.event}</h4>
                <p className="text-sm text-on-surface-variant mt-1">
                  {new Date(gap.startTime).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {new Date(gap.startTime).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {gap.gaps.map((g: any) => (
                    <span key={g.role} className="badge-alert">
                      {g.role}: {g.assigned}/{g.needed}
                    </span>
                  ))}
                </div>
              </div>
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => setOpenDropdown(openDropdown === idx ? null : idx)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-transform active:scale-95"
                  style={{ background: "linear-gradient(135deg, var(--secondary) 0%, #9a7b00 100%)" }}
                >
                  Assign Now
                </button>
                  {openDropdown === idx && (
                    <div className="absolute right-0 top-full mt-2 w-64 glass-overlay rounded-xl shadow-lg z-10 max-h-60 overflow-y-auto ghost-border">
                      <div className="p-2 space-y-1">
                        {["operations", "security", "greeter"].map((role) => {
                          const gapForRole = gap.gaps.find((g: any) => g.role === role)
                          if (!gapForRole) return null
                          return (
                            <div key={role}>
                              <p className="text-xs font-bold text-on-surface-variant uppercase px-2 py-1">{role}</p>
                              <div className="space-y-1">
                                {availableStaff
                                  .filter((s) => s.role === role)
                                  .map((member) => (
                                    <button
                                      key={member.id}
                                      onClick={() => handleAssign(gap.eventId, member.id, role)}
                                      disabled={assigning}
                                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-surface-container transition-colors text-on-surface disabled:opacity-50"
                                    >
                                      {member.full_name || member.email}
                                    </button>
                                  ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
