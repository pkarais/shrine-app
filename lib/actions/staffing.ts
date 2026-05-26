"use server"
import { createServerClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { createHash } from "crypto"
import { getScheduleForDate } from "@/data/employee-schedules"

const SCHEDULE_ROLE_MAP: Record<string, string> = {
  Paul: "director", Fabio: "operations", Josh: "operations", Paulin: "operations",
  Demetri: "greeter", Marcus: "greeter",
  Teresa: "security", Ryan: "security", Ken: "security", Jose: "security",
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function deterministicUuid(input: string) {
  const hash = createHash("sha1").update(input).digest("hex")
  const part1 = hash.slice(0, 8)
  const part2 = hash.slice(8, 12)
  const part3 = `5${hash.slice(13, 16)}`
  const part4 = `a${hash.slice(17, 20)}`
  const part5 = hash.slice(20, 32)
  return `${part1}-${part2}-${part3}-${part4}-${part5}`
}

function normalizeAssigneeId(rawId: string) {
  const value = String(rawId || "").trim()
  if (isUuid(value)) return value
  return deterministicUuid(value)
}

export async function validateStaffingForEvent(eventId: number) {
  const supabase = createServerClient()
  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single()
  if (!event) throw new Error("Event not found")
  const { data: assignments } = await supabase
    .from("staff_assignments")
    .select("role_assigned")
    .eq("event_id", eventId)
  const counts: Record<string, number> = { operations: 0, security: 0, greeter: 0, director: 0 }
  assignments?.forEach((a: any) => { if (counts[a.role_assigned] !== undefined) counts[a.role_assigned]++ })

  // Check schedule data for this event's date — skip gap check if no schedule exists
  const eventDate = new Date(event.start_time).toISOString().split("T")[0]
  const dailySchedule = getScheduleForDate(eventDate)
  if (dailySchedule.length > 0) {
    for (const s of dailySchedule) {
      if (s.shiftStart && s.shiftEnd) {
        const mappedRole = SCHEDULE_ROLE_MAP[s.staffName]
        if (mappedRole && counts[mappedRole] !== undefined) counts[mappedRole]++
      }
    }
  } else {
    // No schedule data for this date — don't flag as gap (unknown staffing)
    return { sufficient: true, gaps: [], event }
  }

  const gaps = []
  if (counts.operations < event.required_ops) gaps.push({ role: "operations", needed: event.required_ops, assigned: counts.operations })
  if (counts.security < event.required_security) gaps.push({ role: "security", needed: event.required_security, assigned: counts.security })
  if (counts.greeter < event.required_greeter) gaps.push({ role: "greeter", needed: event.required_greeter, assigned: counts.greeter })
  if (event.director_mandatory && counts.director < 1) gaps.push({ role: "director", needed: 1, assigned: counts.director })
  return { sufficient: gaps.length === 0, gaps, event }
}

export async function getStaffingGaps(dateFrom?: string, dateTo?: string) {
  const supabase = createServerClient()
  let query = supabase.from("events").select("*").order("start_time", { ascending: true })
  if (dateFrom) query = query.gte("start_time", dateFrom)
  if (dateTo) query = query.lte("start_time", dateTo)
  const { data: events } = await query
  if (!events || events.length === 0) return []

  // Fetch ALL assignments in one batch
  const eventIds = events.map((e: any) => e.id)
  const { data: allAssignments } = await supabase
    .from("staff_assignments")
    .select("event_id, role_assigned, user_id")
    .in("event_id", eventIds)

  const assignByEvent: Record<number, Record<string, number>> = {}
  for (const a of allAssignments || []) {
    if (!assignByEvent[a.event_id]) assignByEvent[a.event_id] = { operations: 0, security: 0, greeter: 0, director: 0 }
    const role = String(a.role_assigned || "").toLowerCase()
    if (assignByEvent[a.event_id][role] !== undefined) assignByEvent[a.event_id][role]++
  }

  const gaps = []
  for (const event of events) {
    // Skip daily operational defaults — covered by the general staff schedule
    const title = String(event.title || "")
    if (title === "Staff Operational Window" || title === "Open for Tourism") continue

    const eventDate = new Date(event.start_time).toISOString().split("T")[0]
    
    // Start with database assignment counts
    const dbCounts = assignByEvent[event.id] || { operations: 0, security: 0, greeter: 0, director: 0 }
    
    // Create a copy for total counts
    const counts = { ...dbCounts }
    
    // Check schedule data to fill gaps (only add if DB assignments don't meet requirements)
    const dailySchedule = getScheduleForDate(eventDate)
    if (dailySchedule.length > 0) {
      // Track which schedule staff are already assigned via DB to avoid double counting
      const dbAssignedUserIds = new Set((allAssignments || [])
        .filter(a => a.event_id === event.id)
        .map(a => a.user_id))
      
      for (const s of dailySchedule) {
        if (s.shiftStart && s.shiftEnd) {
          const mappedRole = SCHEDULE_ROLE_MAP[s.staffName]
          if (mappedRole && counts[mappedRole] !== undefined) {
            // Only count schedule staff if there's still a gap for their role
            const needed = event[`required_${mappedRole}`] || (mappedRole === 'director' && event.director_mandatory ? 1 : 0)
            if (counts[mappedRole] < needed) {
              counts[mappedRole]++
            }
          }
        }
      }
    }

    const eventGaps: { role: string; needed: number; assigned: number }[] = []
    if (counts.operations < event.required_ops) eventGaps.push({ role: "operations", needed: event.required_ops, assigned: counts.operations })
    if (counts.security < event.required_security) eventGaps.push({ role: "security", needed: event.required_security, assigned: counts.security })
    if (counts.greeter < event.required_greeter) eventGaps.push({ role: "greeter", needed: event.required_greeter, assigned: counts.greeter })
    if (event.director_mandatory && counts.director < 1) eventGaps.push({ role: "director", needed: 1, assigned: counts.director })

    if (eventGaps.length > 0) {
      gaps.push({ event: event.title, eventId: event.id, gaps: eventGaps, startTime: event.start_time })
    }
  }
  return gaps
}

export async function assignStaff(eventId: number, userId: string, role: string, shiftStart?: string, shiftEnd?: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const hasDevBypass = cookies().get("shrine_dev_session")?.value === "true"

  if (!user && !hasDevBypass) throw new Error("Unauthorized")

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "manager") throw new Error("Only managers can assign staff")
  }

  const admin = createAdminClient()
  const normalizedAssigneeId = normalizeAssigneeId(userId)

  const { data, error } = await admin.from("staff_assignments").insert({
    event_id: eventId, user_id: normalizedAssigneeId, role_assigned: role, shift_start: shiftStart, shift_end: shiftEnd,
  }).select("*").single()
  if (error) throw new Error("Staff insert failed: " + error.message)
  return { success: true, assignment: data }
}

export async function assignDayShift(dateStr: string, shiftName: string, userId: string, role: string, shiftStart?: string, shiftEnd?: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const hasDevBypass = cookies().get("shrine_dev_session")?.value === "true"

  if (!user && !hasDevBypass) throw new Error("Unauthorized")

  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "manager") throw new Error("Only managers can assign staff")
  }

  const admin = createAdminClient()

  const isOpening = shiftName.toLowerCase().includes("opening")
  const title = isOpening ? "Opening Shift" : "Closing Shift"
  const fullTitle = `${title} ${dateStr}`
  const eventStart = shiftStart ? new Date(shiftStart) : new Date(`${dateStr}T09:00:00-05:00`)
  const eventEnd = shiftEnd ? new Date(shiftEnd) : new Date(`${dateStr}T17:00:00-05:00`)

  const { data: existing } = await admin.from("events").select("id").eq("title", fullTitle).maybeSingle()
  let eventId = existing?.id

  if (!eventId) {
    const { data: created, error: createErr } = await admin.from("events").insert({
      title: fullTitle,
      start_time: eventStart.toISOString(),
      end_time: eventEnd.toISOString(),
      description: `${title} — operational hours`,
      required_ops: 1,
      required_security: 1,
      required_greeter: 0,
      director_mandatory: false,
      category: "standard",
    }).select("id").single()
    if (createErr) throw new Error("Event insert failed: " + createErr.message)
    eventId = created?.id
  }

  if (!eventId) throw new Error("Failed to create day shift event")

  const normalizedAssigneeId = normalizeAssigneeId(userId)
  const { data, error } = await admin.from("staff_assignments").insert({
    event_id: eventId,
    user_id: normalizedAssigneeId,
    role_assigned: role,
    shift_start: eventStart.toISOString(),
    shift_end: eventEnd.toISOString(),
  }).select("*").single()

  if (error) throw new Error(error.message)
  return { success: true, assignment: data }
}

export async function getEventAssignments(eventId: number) {
  const admin = createAdminClient()
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")
  const { data, error } = await admin
    .from("staff_assignments")
    .select("*")
    .eq("event_id", eventId)
  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []

  const userIds = Array.from(new Set(data.map(s => s.user_id).filter(Boolean)))
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds)

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  return data.map(s => ({ ...s, profiles: profileMap.get(s.user_id) || null }))
}
