"use client"

import { User, Clock, Download } from "lucide-react"

interface Shift {
  id?: string
  user_id: string
  clock_in: string
  clock_out?: string | null
  events?: { title: string } | null
  profiles?: { full_name: string | null; email: string; role: string } | null
}

export function StaffTable({ shifts }: { shifts: Shift[] }) {
  const staffMap = new Map<string, { count: number; totalHours: number; lastShift?: string; name: string; role: string }>()

  shifts.forEach((shift) => {
    const existing = staffMap.get(shift.user_id) ?? { count: 0, totalHours: 0, name: shift.user_id.slice(0, 8), role: "" }
    let hours = 0
    if (shift.clock_out) {
      hours = (new Date(shift.clock_out).getTime() - new Date(shift.clock_in).getTime()) / (1000 * 60 * 60)
    }
    const profile = shift.profiles
    const displayName = profile?.full_name ?? profile?.email ?? shift.user_id.slice(0, 8)
    const role = profile?.role ?? ""
    staffMap.set(shift.user_id, {
      count: existing.count + 1,
      totalHours: existing.totalHours + hours,
      lastShift: shift.events?.title ?? existing.lastShift,
      name: displayName,
      role,
    })
  })

  const staff = Array.from(staffMap.entries()).map(([id, data]) => ({ id, ...data }))

  const roleColor: Record<string, string> = {
    operations: "bg-[var(--primary-fixed)] text-[var(--primary)]",
    security: "bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]",
    manager: "bg-[var(--secondary-container)] text-[var(--secondary)]",
  }

  function exportCSV() {
    const headers = ["Name", "Role", "Shifts", "Total Hours", "Last Event"]
    const rows = staff.map((m) => [
      m.name,
      m.role,
      m.count.toString(),
      m.totalHours.toFixed(2),
      m.lastShift || "",
    ])

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `staff-activity-${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <section className="section-wrapper p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs label-text text-[var(--on-surface-variant)] mb-1">Staff Activity</p>
          <p className="body-md">{staff.length} unique staff members</p>
        </div>
        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-container-highest)] text-[var(--on-surface)] rounded-xl font-semibold text-sm hover:bg-[var(--surface-container)] transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>
      <div className="space-y-4">
        {staff.map((member) => (
          <div key={member.id} className="flex items-center justify-between p-4 bg-[var(--surface-container-lowest)] rounded-lg">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full sacred-gradient flex items-center justify-center text-white font-display font-bold">
                {member.name[0]?.toUpperCase() ?? "S"}
              </div>
              <div>
                <p className="font-semibold text-[var(--on-surface)]">{member.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {member.role && (
                    <span className={`text-[10px] label-text font-semibold px-2 py-0.5 rounded-full ${roleColor[member.role] ?? "bg-[var(--surface-container)] text-[var(--on-surface-variant)]"}`}>
                      {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                    </span>
                  )}
                  {member.lastShift && (
                    <span className="text-xs text-[var(--on-surface-variant)]">{member.lastShift}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display font-bold text-[var(--primary)]">{member.count}</p>
              <p className="text-xs text-[var(--on-surface-variant)] flex items-center gap-1 justify-end">
                <Clock className="w-3 h-3" />
                {member.totalHours.toFixed(1)}h
              </p>
            </div>
          </div>
        ))}
        {staff.length === 0 && (
          <div className="text-center py-12 text-[var(--on-surface-variant)] body-md">No staff activity recorded</div>
        )}
      </div>
    </section>
  )
}
