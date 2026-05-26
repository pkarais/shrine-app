"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { injectSundayOrthros, type CalendarEvent } from "@/lib/calendar-defaults"
import { getScheduleForDate } from "@/data/employee-schedules"

/** Returns admin client in dev-bypass mode (no auth user), otherwise normal server client */
async function getClient() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) return supabase

  const hasDevBypass = cookies().get('shrine_dev_session')?.value === 'true'
  if (hasDevBypass && process.env.NODE_ENV === 'development') {
    return createAdminClient()
  }
  return supabase
}

export async function getCurrentOrNextEvent() {
  const supabase = await getClient()
  const now = new Date().toISOString()
  
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .or(`end_time.gte.${now},end_time.is.null`)
    .order("start_time", { ascending: true })
    .limit(1)

  if (error) return null
  if (data?.[0]) return data[0]

  // No upcoming event — check for default Sunday Orthros & Matins
  const todayStr = new Date().toISOString().split("T")[0]
  const sundayEvents = injectSundayOrthros(todayStr, [])
  if (sundayEvents.length === 0) return null

  const orthros = sundayEvents[0] as CalendarEvent
  return orthros
}

const SCHEDULE_EMAIL_MAP: Record<string, string> = {
  Fabio: "gccpainting@yahoo.com",
  Josh: "joshua.bernasconi@gmail.com",
  Paulin: "paulinsimoni12@gmail.com",
  Demetri: "dimitriszach@gmail.com",
  Marcus: "mmarrero4@fordham.edu",
  Paul: "polichronis369@gmail.com",
  Teresa: "teresapigford92@gmail.com",
  Ryan: "mannryan@me.com",
  Ken: "kendon.marshall@gmail.com",
  Jose: "kito9233@yahoo.com",
}

export async function getStaffForEvent(eventId: number) {
  const supabase = await getClient()

  // 1. Get DB assignments for this event (with shift times)
  const { data: assignments, error } = await supabase
    .from("staff_assignments")
    .select("user_id, role_assigned, shift_start, shift_end")
    .eq("event_id", eventId)

  if (error) return []

  const assignedUserIds = new Set(assignments?.map(s => s.user_id) || [])
  const merged = [...(assignments || [])]

  // 2. Merge in today's employee schedule (embedded schedule)
  const todayStr = new Date().toISOString().split("T")[0]
  const scheduleToday = getScheduleForDate(todayStr).filter(s => s.shiftStart && s.shiftEnd)

  if (scheduleToday.length > 0) {
    const scheduleEmails = scheduleToday
      .map(s => SCHEDULE_EMAIL_MAP[s.staffName])
      .filter(Boolean) as string[]

    if (scheduleEmails.length > 0) {
      const { data: scheduleProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("email", scheduleEmails)

      for (const s of scheduleToday) {
        const email = SCHEDULE_EMAIL_MAP[s.staffName]
        if (!email) continue
        const profile = scheduleProfiles?.find(p => p.email === email)
        if (profile && !assignedUserIds.has(profile.id)) {
          const startTime = s.shiftStart || null
          const endTime = s.shiftEnd || null
          merged.push({
            user_id: profile.id,
            role_assigned: profile.role || "operations",
            shift_start: startTime,
            shift_end: endTime,
          })
          assignedUserIds.add(profile.id)
        }
      }
    }
  }

  // 3. Fetch profile display info
  const userIds = Array.from(new Set(merged.map(s => s.user_id).filter(Boolean)))
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds)

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  return merged
    .map(s => ({
      user_id: s.user_id,
      role_assigned: s.role_assigned,
      shift_start: (s as any).shift_start || null,
      shift_end: (s as any).shift_end || null,
      profiles: profileMap.get(s.user_id) || null,
    }))
    .filter(s => s.profiles !== null)
}

export async function getOperationsSummary() {
  const supabase = await getClient()
  
  const [
    { count: openTickets },
    { count: highPriorityTickets },
    { data: recentWalkthroughs }
  ] = await Promise.all([
    supabase.from("maintenance_tickets").select("id", { count: "exact" }).eq("status", "open"),
    supabase.from("maintenance_tickets").select("id", { count: "exact" }).in("priority", ["high", "urgent"]).eq("status", "open"),
    supabase.from("walkthroughs").select("id, user_id, walkthrough_type, category, completed_at").order("completed_at", { ascending: false }).limit(10)
  ])

  // Enrich with profile names
  let enriched: any[] = recentWalkthroughs || []
  if (enriched.length > 0) {
    const uids = Array.from(new Set(enriched.map((w: any) => w.user_id).filter(Boolean)))
    const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", uids)
    const pmap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]))
    enriched = enriched.map((w: any) => ({ ...w, user_name: pmap.get(w.user_id) || null }))
  }

  return {
    openTickets: openTickets || 0,
    highPriorityTickets: highPriorityTickets || 0,
    recentWalkthroughs: enriched
  }
}
