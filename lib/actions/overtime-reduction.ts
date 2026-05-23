"use server"
import { createServerClient } from "@/utils/supabase/server"

export async function analyzeOvertimeReductionByEvent(eventId?: number) {
  const supabase = createServerClient()
  let query = supabase.from("shifts").select("*, events(title)")
  if (eventId) query = query.eq("event_id", eventId)
  const { data: shifts } = await query

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
      eventTitle: shift.events?.title,
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
