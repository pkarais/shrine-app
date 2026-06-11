"use client"

import { useState } from "react"

interface StaffMember {
  id: string
  name: string
  role: string
  status: "checked-in" | "on-break" | "checked-out"
  hours: number
}

export function Roster({ staff }: { staff: StaffMember[] }) {
  const [filter, setFilter] = useState<"all" | "checked-in" | "on-break">("all")

  const filtered = filter === "all" ? staff : staff.filter((s) => s.status === filter)

  const statusBadge = (status: string) => {
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

  return (
    <div className="bg-surface-container-low rounded-[2rem] p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-headline text-xl font-bold text-primary">Active Roster</h3>
        <span className="bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full text-xs font-bold">
          {staff.filter((s) => s.status === "checked-in").length} On-site
        </span>
      </div>

      <div className="flex gap-2 mb-6">
        {(["all", "checked-in", "on-break"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
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
              <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">person</span>
              </div>
              <div>
                <p className="font-semibold text-sm text-on-surface">{member.name}</p>
                <p className="text-xs text-on-surface-variant">{member.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusBadge(member.status)}`}>
                {member.status.replace("-", " ")}
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
