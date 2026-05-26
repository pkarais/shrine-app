"use client"

import { useMemo } from "react"
import { getScheduleForDateRange, type DayShift } from "@/data/employee-schedules"

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const STAFF_ROLES: Record<string, string> = {
  Paul: "Director", Fabio: "Porter", Josh: "Porter", Paulin: "Porter",
  Demetri: "Greeter", Marcus: "Greeter",
  Teresa: "Security", Ryan: "Security", Ken: "Security", Jose: "Security",
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":")
  const hr = parseInt(h, 10)
  const ampm = hr >= 12 ? "PM" : "AM"
  const hr12 = hr === 0 ? 12 : hr > 12 ? hr - 12 : hr
  return `${hr12}:${m} ${ampm}`
}

export function RecurringScheduleCalendar({ selectedDate }: { selectedDate: string }) {
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

  const sortedStaff = useMemo(() => {
    const ROLE_ORDER = ["Director", "Porter", "Greeter", "Security"]
    return [...staffNames].sort((a, b) => {
      const ra = ROLE_ORDER.indexOf(STAFF_ROLES[a] || "")
      const rb = ROLE_ORDER.indexOf(STAFF_ROLES[b] || "")
      if (ra !== rb) return ra - rb
      return a.localeCompare(b)
    })
  }, [staffNames])

  return (
    <div className="bg-surface-container-low rounded-[2rem] overflow-hidden">
      <div className="p-6 pb-4">
        <h3 className="font-headline text-xl font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined">calendar_month</span>
          Staff Schedule
        </h3>
        <p className="text-xs text-on-surface-variant mt-1">
          Weekly schedule view. Manager can override individual shifts.
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
                    const daySchedule = scheduleByDate[dayStr]?.filter(s => s.staffName === name) || []
                    const shift = daySchedule[0]
                    const isOff = !shift || (shift.shiftStart === null && shift.shiftEnd === null)
                    const isSelected = dayStr === selectedDate

                    if (dayStr === "2026-05-25") {
                      // Memorial Day - Church Closed
                      return (
                        <td key={i} className={`px-3 py-3 text-center ${isSelected ? "ring-2 ring-inset ring-primary" : ""}`}>
                          <span className="text-[10px] text-error font-bold uppercase leading-tight block">Closed</span>
                        </td>
                      )
                    }

                    return (
                      <td key={i} className={`px-3 py-3 text-center align-top ${isSelected ? "ring-2 ring-inset ring-primary/30 bg-primary/5" : ""}`}>
                        {isOff ? (
                          <span className="text-[11px] text-on-surface-variant/40 font-medium">OFF</span>
                        ) : shift?.shiftStart && shift?.shiftEnd ? (
                          <div className="space-y-0.5">
                            <span className="block text-[13px] font-bold text-on-surface leading-tight">
                              {formatTime(shift.shiftStart)}
                            </span>
                            <span className="block text-[11px] text-on-surface-variant leading-tight">
                              {formatTime(shift.shiftEnd)}
                            </span>
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
    </div>
  )
}
