"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { LABOR } from "@/constants"

export interface OptimizationSuggestion {
  shiftId: string
  userId: string
  userName: string
  currentHours: number
  suggestedHours: number
  reason: string
}

export async function analyzeOvertimeReduction(): Promise<OptimizationSuggestion[]> {
  const admin = createAdminClient()
  
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const { data: shifts } = await admin
    .from("shifts")
    .select("*")
    .gte("clock_in", thirtyDaysAgo.toISOString())
    .not("clock_out", "is", null)
  
  if (!shifts) return []
  
  const userIds: string[] = Array.from(new Set(shifts.map((s: any) => s.user_id).filter(Boolean)))
  let profileMap = new Map<string, { full_name: string; email: string }>()
  if (userIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, full_name, email").in("id", userIds)
    profileMap = new Map((profiles || []).map(p => [p.id, p]))
  }
  
  const suggestions: OptimizationSuggestion[] = []
  const userHours = new Map<string, { name: string; totalHours: number; shifts: number }>()
  
  shifts.forEach((shift: any) => {
    const profile = profileMap.get(shift.user_id)
    const hours = (new Date(shift.clock_out).getTime() - new Date(shift.clock_in).getTime()) / (1000 * 60 * 60)
    const paidHours = Math.max(0, hours - (hours >= 5 ? 0.5 : 0))
    
    const existing = userHours.get(shift.user_id) || { name: profile?.full_name || profile?.email || shift.user_id.slice(0, 8), totalHours: 0, shifts: 0 }
    existing.totalHours += paidHours
    existing.shifts += 1
    userHours.set(shift.user_id, existing)
  })
  
  userHours.forEach((data, userId) => {
    if (data.totalHours > LABOR.OVERTIME_THRESHOLD_HOURS * 4) {
      const suggestedMax = LABOR.OVERTIME_THRESHOLD_HOURS * 4
      suggestions.push({
        shiftId: "",
        userId,
        userName: data.name,
        currentHours: Math.round(data.totalHours * 10) / 10,
        suggestedHours: suggestedMax,
        reason: `Reduce hours from ${Math.round(data.totalHours)}h to ${suggestedMax}h to minimize overtime. Consider ${data.shifts} shifts over 4 weeks.`
      })
    }
  })
  
  return suggestions.sort((a, b) => b.currentHours - a.currentHours).slice(0, 10)
}

export async function getStaffUtilization() {
  const admin = createAdminClient()
  
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  
  const { data: shifts } = await admin
    .from("shifts")
    .select("*")
    .gte("clock_in", thirtyDaysAgo.toISOString())
  
  if (!shifts) return []
  
  const userIds: string[] = Array.from(new Set(shifts.map((s: any) => s.user_id).filter(Boolean)))
  let profileMap = new Map<string, { full_name: string; email: string; role: string }>()
  if (userIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, full_name, email, role").in("id", userIds)
    profileMap = new Map((profiles || []).map(p => [p.id, p]))
  }
  
  const utilization = new Map<string, { name: string; role: string; hours: number; shifts: number }>()
  
  shifts.forEach((shift: any) => {
    const profile = profileMap.get(shift.user_id)
    const hours = shift.clock_out 
      ? (new Date(shift.clock_out).getTime() - new Date(shift.clock_in).getTime()) / (1000 * 60 * 60)
      : (Date.now() - new Date(shift.clock_in).getTime()) / (1000 * 60 * 60)
    
    const existing = utilization.get(shift.user_id) || { 
      name: profile?.full_name || profile?.email || "Unknown",
      role: profile?.role || "operations",
      hours: 0,
      shifts: 0
    }
    existing.hours += hours
    existing.shifts += 1
    utilization.set(shift.user_id, existing)
  })
  
  return Array.from(utilization.entries())
    .map(([id, data]) => ({ userId: id, ...data, hours: Math.round(data.hours * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours)
}
