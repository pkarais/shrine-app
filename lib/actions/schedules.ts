"use server"

import { getScheduleForDate, getScheduleForWeek, getAllStaffNames, type DayShift } from "@/data/employee-schedules"

export async function getSchedulesForDay(dateStr: string): Promise<DayShift[]> {
  return getScheduleForDate(dateStr)
}

export async function getSchedulesForWeek(startDate: string): Promise<DayShift[]> {
  return getScheduleForWeek(startDate)
}

export async function getAllScheduledStaff(): Promise<string[]> {
  return getAllStaffNames()
}
