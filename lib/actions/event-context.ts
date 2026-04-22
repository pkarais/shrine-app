"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

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
  
  // Find event that is active OR is the next upcoming event
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .or(`end_time.gte.${now},end_time.is.null`)
    .order("start_time", { ascending: true })
    .limit(1)

  if (error) return null
  return data?.[0] || null
}

export async function getStaffForEvent(eventId: number) {
  const supabase = await getClient()
  const { data, error } = await supabase
    .from("staff_assignments")
    .select(`
      user_id,
      role_assigned,
      profiles:profiles!staff_assignments_user_id_fkey(full_name, email)
    `)
    .eq("event_id", eventId)

  if (error) return []
  return data || []
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
