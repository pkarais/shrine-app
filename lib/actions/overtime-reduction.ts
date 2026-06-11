"use server"
import { createAdminClient } from "@/utils/supabase/server"

export async function analyzeOvertimeReductionByEvent(eventId?: number) {
  const admin = createAdminClient()
  let query = admin.from("shifts").select("*")
  if (eventId) query = query.eq("event_id", eventId)
  const { data: shifts } = await query

  const eventIds: number[] = Array.from(new Set((shifts || []).map((s: any) => s.event_id).filter(Boolean)))
  let eventMap = new Map<number, any>()
  if (eventIds.length > 0) {
    const { data: events } = await admin.from("events").select("id, title").in("id", eventIds)
    eventMap = new Map((events || []).map(e => [e.id, e]))
  }

  const suggestions = []
  const overtimeShifts = shifts?.filter((s: any) => {
    if (!s.clock_out) return false
    const hours = (new Date(s.clock_out).getTime() - new Date(s.clock_in).getTime()) / (1000 * 60 * 60)
    return hours > 8
  }) || []

  for (const shift of overtimeShifts) {
    const otHours = ((new Date(shift.clock_out).getTime() - new Date(shift.clock_in).getTime()) / (1000 * 60 * 60)) - 8
    const otCost = otHours * 25
    suggestions.push({
      shiftId: shift.id,
      userId: shift.user_id,
      eventTitle: eventMap.get(shift.event_id)?.title,
      overtimeHours: Math.round(otHours * 10) / 10,
      estimatedCost: Math.round(otCost * 100) / 100,
      suggestion: `Split shift: assign second staff for last ${Math.round(otHours * 60)} minutes`,
    })
  }

  return {
    totalOvertimeShifts: overtimeShifts.length,
    totalEstimatedCost: Math.round(suggestions.reduce((sum, s) => sum + s.estimatedCost, 0) * 100) / 100,
    suggestions,
  }
}
