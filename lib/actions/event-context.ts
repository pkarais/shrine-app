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
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await admin
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

export async function getTodayEvents(): Promise<CalendarEvent[]> {
  const admin = createAdminClient()
  const now = new Date()

  // Resolve today's date in Eastern time
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now)
  const todayStr = `${parts.find(p => p.type === "year")?.value}-${parts.find(p => p.type === "month")?.value}-${parts.find(p => p.type === "day")?.value}`

  // Wide UTC window to catch Eastern-time events regardless of UTC offset
  const queryStart = new Date(`${todayStr}T00:00:00.000Z`)
  queryStart.setTime(queryStart.getTime() - 12 * 60 * 60 * 1000)
  const queryEnd = new Date(`${todayStr}T00:00:00.000Z`)
  queryEnd.setTime(queryEnd.getTime() + 36 * 60 * 60 * 1000)

  const { data } = await admin
    .from("events")
    .select("*")
    .gte("start_time", queryStart.toISOString())
    .lt("start_time", queryEnd.toISOString())
    .order("start_time", { ascending: true })

  const localDateKey = (value: string) => {
    const p = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(new Date(value))
    return `${p.find(x => x.type === "year")?.value}-${p.find(x => x.type === "month")?.value}-${p.find(x => x.type === "day")?.value}`
  }

  let events = (data || []).filter((e: any) =>
    localDateKey(e.start_time) === todayStr &&
    e.title !== "Staff Operational Window" &&
    e.title !== "Open for Tourism"
  ) as CalendarEvent[]

  events = injectSundayOrthros(todayStr, events)
  events.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  return events
}

export async function getStaffForEvent(eventId: number) {
  const supabase = await getClient()
  const admin = createAdminClient()

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
    // Resolve short names via staff_directory (single source of truth)
    const scheduleNames = scheduleToday.map(s => s.staffName)
    const { data: directoryEntries } = await admin
      .from("staff_directory")
      .select("name, profile_id")
      .in("name", scheduleNames)
      .not("profile_id", "is", null)

    const nameToProfileId = new Map(
      (directoryEntries || []).map(e => [e.name, e.profile_id as string])
    )

    const profileIds = Array.from(new Set(
      scheduleNames.map(n => nameToProfileId.get(n)).filter(Boolean) as string[]
    ))

    if (profileIds.length > 0) {
      const { data: scheduleProfiles } = await admin
        .from("profiles")
        .select("id, full_name, email, role")
        .in("id", profileIds)

      const profileById = new Map((scheduleProfiles || []).map(p => [p.id, p]))

      for (const s of scheduleToday) {
        const profileId = nameToProfileId.get(s.staffName)
        if (!profileId) continue
        const profile = profileById.get(profileId)
        if (profile && !assignedUserIds.has(profile.id)) {
          merged.push({
            user_id: profile.id,
            role_assigned: profile.role || "operations",
            shift_start: s.shiftStart || null,
            shift_end: s.shiftEnd || null,
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
