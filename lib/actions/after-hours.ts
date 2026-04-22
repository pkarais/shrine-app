import { createServerClient } from "@/utils/supabase/server"

export function isAfterHours(startTime: string, endTime: string): boolean {
  const start = new Date(startTime)
  const end = endTime ? new Date(endTime) : start
  return start.getHours() >= 17 || end.getHours() > 17 || start.getHours() < 9
}

export async function validateAfterHoursStaffing(eventId: number) {
  const supabase = createServerClient()
  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single()
  if (!event) throw new Error("Event not found")
  if (!isAfterHours(event.start_time, event.end_time)) return { isAfterHours: false, sufficient: true, gaps: [] }
  const { data: assignments } = await supabase.from("staff_assignments").select("role_assigned").eq("event_id", eventId)
  const counts = { operations: 0, security: 0 }
  assignments?.forEach((a: any) => { if (a.role_assigned === "operations") counts.operations++; if (a.role_assigned === "security") counts.security++ })
  const gaps = []
  if (counts.operations < 1) gaps.push({ role: "operations", needed: 1, assigned: counts.operations })
  if (counts.security < 1) gaps.push({ role: "security", needed: 1, assigned: counts.security })
  return { isAfterHours: true, sufficient: gaps.length === 0, gaps }
}
