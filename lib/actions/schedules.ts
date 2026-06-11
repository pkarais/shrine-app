"use server"

// Snapshot-driven schedule helpers. Source of truth is the latest
// uploaded schedule (PDF/Excel/CSV/paste) keyed by day-of-week; only
// falls back to the static `data/employee-schedules.ts` if no upload
// has been saved yet. Names are canonicalized against staff_directory
// inside getTemplateScheduleForRange.

import { type DayShift } from "@/data/employee-schedules"
import { getTemplateScheduleForRange } from "./schedule-template-week"

export async function getSchedulesForDay(dateStr: string): Promise<DayShift[]> {
  const { shiftsByDate } = await getTemplateScheduleForRange(dateStr, dateStr)
  return shiftsByDate[dateStr] || []
}

export async function getSchedulesForWeek(startDate: string): Promise<DayShift[]> {
  const end = new Date(startDate + "T12:00:00Z")
  end.setUTCDate(end.getUTCDate() + 6)
  const endStr = end.toISOString().slice(0, 10)
  const { shiftsByDate } = await getTemplateScheduleForRange(startDate, endStr)
  return Object.values(shiftsByDate).flat()
}

export async function getAllScheduledStaff(): Promise<string[]> {
  const { staffRoleMap } = await getTemplateScheduleForRange(
    new Date().toISOString().slice(0, 10),
    new Date().toISOString().slice(0, 10),
  )
  return Object.keys(staffRoleMap).sort()
}
