"use server"
import { createServerClient, createAdminClient } from "@/utils/supabase/server"

/**
 * Returns the hour (0-23) for a Date in Eastern Time.
 * Uses Intl so it is DST-aware and correct on UTC servers (Vercel).
 */
function etHour(date: Date): number {
  if (isNaN(date.getTime())) return -1
  const str = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    hour12: false,
  }).format(date)
  const h = parseInt(str, 10)
  // Intl may return 24 for midnight — normalise.
  return h === 24 ? 0 : h
}

export function isAfterHours(startTime: string, endTime: string): boolean {
  const start = new Date(startTime)
  // Guard against empty string — new Date("") is Invalid Date.
  const end = endTime ? new Date(endTime) : start
  const startH = etHour(start)
  const endH = etHour(end)
  // After-hours: event begins before 9 AM ET or at/after 5 PM ET.
  return startH < 0 || startH >= 17 || endH > 17 || startH < 9
}

export async function validateAfterHoursStaffing(eventId: number) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const admin = createAdminClient()
  const { data: event } = await admin.from("events").select("*").eq("id", eventId).single()
  if (!event) throw new Error("Event not found")
  if (!isAfterHours(event.start_time, event.end_time)) return { isAfterHours: false, sufficient: true, gaps: [] }
  const { data: assignments } = await admin.from("staff_assignments").select("role_assigned").eq("event_id", eventId)
  const counts = { operations: 0, security: 0 }
  assignments?.forEach((a: any) => { if (a.role_assigned === "operations") counts.operations++; if (a.role_assigned === "security") counts.security++ })
  const gaps = []
  if (counts.operations < 1) gaps.push({ role: "operations", needed: 1, assigned: counts.operations })
  if (counts.security < 1) gaps.push({ role: "security", needed: 1, assigned: counts.security })
  return { isAfterHours: true, sufficient: gaps.length === 0, gaps }
}
