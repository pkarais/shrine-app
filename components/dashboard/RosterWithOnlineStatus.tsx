"use client"

import { useState, useEffect } from "react"
import { getStaffOnlineStatus } from "@/lib/actions/user-sessions"

interface StaffStatus {
  id: string
  full_name: string
  email: string
  role: string
  is_online: boolean
  currently_signed_in: boolean
  last_heartbeat: string | null
}

interface StaffMember extends StaffStatus {
  status: "checked-in" | "on-break" | "checked-out"
  hours: number
}

export function RosterWithOnlineStatus({ shifts }: { shifts: any[] }) {
  const [filter, setFilter] = useState<"all" | "online" | "checked-in" | "on-break">("all")
  const [staffStatus, setStaffStatus] = useState<StaffStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStaffStatus()
    // Poll for online status every 30 seconds
    const interval = setInterval(loadStaffStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  async function loadStaffStatus() {
    try {
      const data = await getStaffOnlineStatus()
      setStaffStatus(data)
    } catch (err) {
      console.error("Failed to load staff online status:", err)
    } finally {
      setLoading(false)
    }
  }

  // Combine online status with shift data
  const staffWithStatus: StaffMember[] = staffStatus.map((staff) => {
    const shift = shifts.find((s) => s.user_id === staff.id)
    return {
      ...staff,
      status: shift ? (shift.on_break ? "on-break" : "checked-in") : "checked-out",
      hours: shift?.hours || 0,
    }
  })

  const filtered = staffWithStatus.filter((s) => {
    if (filter === "all") return true
    if (filter === "online") return s.is_online
    if (filter === "checked-in") return s.status === "checked-in"
    if (filter === "on-break") return s.status === "on-break"
    return true
  })

  const statusBadge = (status: string, isOnline: boolean) => {
    if (isOnline && status === "checked-out") {
      return "bg-emerald-600 text-white"
    }
    switch (status) {
      case "checked-in":
        return "bg-primary-fixed text-on-primary-fixed"
      case "on-break":
        return "bg-secondary-container text-on-secondary-container"
      case "checked-out":
        return "bg-surface-container text-on-surface-variant"
      default:
        return "bg-surface-container text-on-surface-variant"
    }
  }

  const statusLabel = (status: string, isOnline: boolean) => {
    if (isOnline && status === "checked-out") {
      return "Online"
    }
    return status.replace("-", " ")
  }

  if (loading) {
    return (
      <div className="bg-surface-container-low rounded-[2rem] p-8">
        <p className="text-on-surface-variant">Loading staff status...</p>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-low rounded-[2rem] p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-headline text-xl font-bold text-primary">Active Roster</h3>
        <div className="flex items-center gap-4">
          <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold">
            {staffWithStatus.filter((s) => s.is_online).length} Online
          </span>
          <span className="bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full text-xs font-bold">
            {staffWithStatus.filter((s) => s.status === "checked-in").length} On-site
          </span>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(["all", "online", "checked-in", "on-break"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              filter === f
                ? "bg-primary text-on-primary"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-highest"
            }`}
          >
            {f.replace("-", " ")}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((member) => (
          <div
            key={member.id}
            className="bg-surface-container-lowest p-4 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center relative">
                <span className="material-symbols-outlined text-primary">person</span>
                {member.is_online && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-surface-container-lowest ring-1 ring-emerald-500/30" />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm text-on-surface">{member.full_name}</p>
                <p className="text-xs text-on-surface-variant">{member.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusBadge(member.status, member.is_online)}`}>
                {statusLabel(member.status, member.is_online)}
              </span>
              <span className="text-sm font-bold text-on-surface-variant">{member.hours}h</span>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">group_off</span>
          <p className="text-sm text-on-surface-variant">No staff members in this category</p>
        </div>
      )}
    </div>
  )
}
