"use client"

import { Users, TrendingUp, AlertCircle } from "lucide-react"

interface Event {
  id?: string
  title: string
  start_time: string
  end_time?: string
  category?: string
  required_ops?: number
  required_security?: number
  required_greeter?: number
}

export function ScheduleOverview({ events, staffingCount }: { events: Event[]; staffingCount?: number }) {
  const computedStaffing = events.reduce(
    (sum, e) => sum + (e.required_ops ?? 0) + (e.required_security ?? 0) + (e.required_greeter ?? 0),
    0
  )
  const totalStaffing = staffingCount ?? computedStaffing
  const majorFeasts = events.filter((e) => e.category === "major_feast").length

  const stats = [
    { label: "Upcoming Events", value: events.length, icon: Users, color: "var(--primary)" },
    { label: "Total Staffing", value: totalStaffing, icon: TrendingUp, color: "var(--secondary)" },
    { label: "Major Feasts", value: majorFeasts, icon: AlertCircle, color: "var(--tertiary)" },
  ]

  return (
    <section className="section-wrapper p-8">
      <p className="text-xs label-text text-[var(--on-surface-variant)] mb-6">Operations Summary</p>
      <div className="grid grid-cols-3 gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <stat.icon className="w-6 h-6 mx-auto mb-3" style={{ color: stat.color }} />
            <p className="display-md font-display" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs label-text text-[var(--on-surface-variant)] mt-2">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
