"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { injectSundayOrthros, type CalendarEvent } from "@/lib/calendar-defaults"
import { getTemplateScheduleForRange } from "./schedule-template-week"
import { getLiveScheduledShiftsForRange } from "./live-schedule"

const parseValidDate = (value: unknown): Date | null => {
  if (!value) return null
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export async function getCurrentOrNextEvent() {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await admin
    .from("events")
    .select("*")
    // Events that haven't finished yet: either end_time is in the future,
    // or end_time is null (open-ended) but start_time is in the past/now.
    // Without the start_time guard a recurring "Regular Shrine Open" event
    // from months ago with end_time=null would always appear as "current".
    .or(`end_time.gte.${now},and(end_time.is.null,start_time.lte.${now})`)
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
    const parsed = parseValidDate(value)
    if (!parsed) return null
    const p = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit",
    }).formatToParts(parsed)
    return `${p.find(x => x.type === "year")?.value}-${p.find(x => x.type === "month")?.value}-${p.find(x => x.type === "day")?.value}`
  }

  let events = (data || []).filter((e: any) =>
    localDateKey(e.start_time) === todayStr &&
    e.title !== "Staff Operational Window" &&
    e.title !== "Open for Tourism"
  ) as CalendarEvent[]

  events = injectSundayOrthros(todayStr, events)
  events.sort((a, b) => {
    const startA = parseValidDate(a.start_time)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const startB = parseValidDate(b.start_time)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return startA - startB
  })
  return events
}

export async function getStaffForEvent(eventId: number) {
  const admin = createAdminClient()

  // 1. Get DB assignments for this event (with shift times)
  const { data: assignments, error } = await admin
    .from("staff_assignments")
    .select("user_id, role_assigned, shift_start, shift_end")
    .eq("event_id", eventId)

  if (error) return []

  // 2. Resolve today's actually-scheduled staff from the LIVE schedule:
  //    the bi-weekly snapshot overlaid with manager grid edits. This is
  //    the SOURCE OF TRUTH for who is working today — stale
  //    staff_assignments rows for people who are OFF must NOT appear in
  //    the dashboard's "Who's Working" tab, and any EDITED shift
  //    (e.g. Jose extended to 8 PM) must show up here.
  const todayStr = new Date().toISOString().split("T")[0]
  const { shiftsByDate } = await getLiveScheduledShiftsForRange(todayStr, todayStr)
  const scheduleToday = (shiftsByDate[todayStr] || []).filter(s => s.shiftStart && s.shiftEnd)

  // Map snapshot staff names → profile_id via staff_directory
  const scheduleNames = scheduleToday.map(s => s.staffName)
  let nameToProfileId = new Map<string, string>()
  if (scheduleNames.length > 0) {
    const { data: directoryEntries } = await admin
      .from("staff_directory")
      .select("name, profile_id")
      .in("name", scheduleNames)
      .not("profile_id", "is", null)
    nameToProfileId = new Map(
      (directoryEntries || []).map(e => [e.name, e.profile_id as string])
    )
  }

  // Set of profile IDs that are actually scheduled today (have a real shift).
  const scheduledTodayIds = new Set<string>()
  const scheduledShiftByProfileId = new Map<string, { start: string; end: string }>()
  for (const s of scheduleToday) {
    const pid = nameToProfileId.get(s.staffName)
    if (!pid) continue
    scheduledTodayIds.add(pid)
    scheduledShiftByProfileId.set(pid, {
      start: s.shiftStart as string,
      end: s.shiftEnd as string,
    })
  }

  // 3. Build the merged list:
  //    - keep event assignments only for users actually scheduled today
  //    - prefer snapshot shift times when the assignment has none
  //    - add any scheduled staff that aren't in event assignments yet
  const merged: Array<{
    user_id: string
    role_assigned: string
    shift_start: string | null
    shift_end: string | null
  }> = []
  const includedIds = new Set<string>()

  for (const a of assignments || []) {
    if (!scheduledTodayIds.has(a.user_id)) continue
    const snapshotShift = scheduledShiftByProfileId.get(a.user_id)
    merged.push({
      user_id: a.user_id,
      role_assigned: a.role_assigned,
      shift_start: a.shift_start || snapshotShift?.start || null,
      shift_end: a.shift_end || snapshotShift?.end || null,
    })
    includedIds.add(a.user_id)
  }

  // Add scheduled staff who aren't already in event assignments
  if (scheduledTodayIds.size > 0) {
    const profileIds = Array.from(scheduledTodayIds)
    const { data: scheduleProfiles } = await admin
      .from("profiles")
      .select("id, role")
      .in("id", profileIds)
    const profileRoleById = new Map(
      (scheduleProfiles || []).map(p => [p.id, p.role as string | null])
    )
    for (const pid of Array.from(scheduledTodayIds)) {
      if (includedIds.has(pid)) continue
      const shift = scheduledShiftByProfileId.get(pid)!
      merged.push({
        user_id: pid,
        role_assigned: profileRoleById.get(pid) || "operations",
        shift_start: shift.start,
        shift_end: shift.end,
      })
      includedIds.add(pid)
    }
  }

  // 4. Fetch profile display info
  const userIds = Array.from(includedIds)
  const { data: profiles } = userIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds)
    : { data: [] as any[] }

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  return merged
    .map(s => ({
      user_id: s.user_id,
      role_assigned: s.role_assigned,
      shift_start: s.shift_start,
      shift_end: s.shift_end,
      profiles: profileMap.get(s.user_id) || null,
    }))
    .filter(s => s.profiles !== null)
}

export async function getOperationsSummary() {
  const admin = createAdminClient()
  
  const [
    { count: openTickets },
    { count: highPriorityTickets },
    { data: recentWalkthroughs }
  ] = await Promise.all([
    admin.from("maintenance_tickets").select("id", { count: "exact" }).eq("status", "open"),
    admin.from("maintenance_tickets").select("id", { count: "exact" }).in("priority", ["high", "urgent"]).eq("status", "open"),
    admin.from("walkthroughs").select("id, user_id, walkthrough_type, category, completed_at").order("completed_at", { ascending: false }).limit(10)
  ])

  // Enrich with profile names
  let enriched: any[] = recentWalkthroughs || []
  if (enriched.length > 0) {
    const uids = Array.from(new Set(enriched.map((w: any) => w.user_id).filter(Boolean)))
    const { data: profiles } = await admin.from("profiles").select("id, full_name").in("id", uids)
    const pmap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]))
    enriched = enriched.map((w: any) => ({ ...w, user_name: pmap.get(w.user_id) || null }))
  }

  return {
    openTickets: openTickets || 0,
    highPriorityTickets: highPriorityTickets || 0,
    recentWalkthroughs: enriched
  }
}
