"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { injectSundayOrthros, type CalendarEvent } from "@/lib/calendar-defaults"

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

export async function getStaffForEvent(eventId: number) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("staff_assignments")
    .select("user_id, role_assigned")
    .eq("event_id", eventId)

  if (error) return []
  if (!data || data.length === 0) return []

  const userIds = Array.from(new Set(data.map(s => s.user_id).filter(Boolean)))
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds)

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  return data.map(s => ({
    user_id: s.user_id,
    role_assigned: s.role_assigned,
    profiles: profileMap.get(s.user_id) || null,
  }))
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
    supabase.from("walkthroughs").select("walkthrough_type, category, completed_at").order("completed_at", { ascending: false }).limit(10)
  ])

  return {
    openTickets: openTickets || 0,
    highPriorityTickets: highPriorityTickets || 0,
    recentWalkthroughs: recentWalkthroughs || []
  }
}
