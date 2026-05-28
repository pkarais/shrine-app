"use server"
import { createServerClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { requireAuth, requireManager } from "./auth-helpers"
import { createHash } from "crypto"
import { getScheduleForDate, getScheduleForDateRange } from "@/data/employee-schedules"

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
  await requireManager()
  const admin = createAdminClient()
  const { data: event } = await admin.from("events").select("*").eq("id", eventId).single()
  if (!event) throw new Error("Event not found")
  const { data: assignments } = await admin
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
  await requireManager()
  const admin = createAdminClient()
  let query = admin.from("events").select("*").order("start_time", { ascending: true })
  if (dateFrom) query = query.gte("start_time", dateFrom)
  if (dateTo) query = query.lte("start_time", dateTo)
  const { data: events } = await query
  if (!events || events.length === 0) return []

  // Fetch ALL assignments in one batch
  const eventIds = events.map((e: any) => e.id)
  const { data: allAssignments } = await admin
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
  await requireAuth()
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

// ─── Week Schedule Assignments (for RecurringScheduleCalendar) ───

export type WeekScheduleAssignment = {
  date: string
  staffName: string
  userId: string
  shiftStart: string | null
  shiftEnd: string | null
  role: string
  assignmentId: string
}

export async function getWeekScheduleAssignments(weekStart: string, weekEnd: string): Promise<WeekScheduleAssignment[]> {
  const admin = createAdminClient()
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")

  // Find all events in the week (including synthetic day-shift events)
  const { data: events } = await admin
    .from("events")
    .select("id, start_time")
    .gte("start_time", `${weekStart}T00:00:00-05:00`)
    .lt("start_time", `${weekEnd}T23:59:59-05:00`)

  const eventIds = (events || []).map(e => e.id)
  if (eventIds.length === 0) return []

  const { data: assignments, error } = await admin
    .from("staff_assignments")
    .select("id, event_id, user_id, role_assigned, shift_start, shift_end")
    .in("event_id", eventIds)

  if (error) throw new Error(error.message)
  if (!assignments || assignments.length === 0) return []

  const userIds = Array.from(new Set(assignments.map(a => a.user_id).filter(Boolean)))
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds)

  const profileMap = new Map((profiles || []).map(p => [p.id, p.full_name || ""]))
  const eventDateMap = new Map((events || []).map(e => [e.id, e.start_time]))

  return assignments.map(a => {
    const eventDate = eventDateMap.get(a.event_id)
    const dateStr = eventDate ? new Date(eventDate).toISOString().split("T")[0] : ""
    return {
      date: dateStr,
      // Return the first word of full_name so it matches the static schedule short names ("Paul Karais" → "Paul")
      staffName: (profileMap.get(a.user_id) || "").split(" ")[0] || "",
      userId: a.user_id,
      shiftStart: a.shift_start ? new Date(a.shift_start).toISOString().slice(11, 16) : null,
      shiftEnd: a.shift_end ? new Date(a.shift_end).toISOString().slice(11, 16) : null,
      role: a.role_assigned || "",
      assignmentId: a.id,
    }
  }).filter(a => a.staffName && a.date)
}

export async function updateScheduleCell(
  dateStr: string,
  staffName: string,
  shiftStart: string | null,
  shiftEnd: string | null,
  role: string,
  staffUserId?: string
) {
  await requireManager()

  const admin = createAdminClient()
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")

  let normalizedUserId: string

  if (staffUserId) {
    normalizedUserId = normalizeAssigneeId(staffUserId)
  } else {
    // Look up in staff_directory first (stores short names like "Paul" with a profile_id link)
    // Use exact case-insensitive match — wildcards cause multi-row conflicts with maybeSingle()
    const { data: directoryEntry } = await admin
      .from("staff_directory")
      .select("profile_id, name")
      .ilike("name", staffName)
      .not("profile_id", "is", null)
      .maybeSingle()

    if (directoryEntry?.profile_id) {
      normalizedUserId = normalizeAssigneeId(directoryEntry.profile_id)
    } else {
      // Fallback: match profiles by first name prefix (e.g. "Paul" matches "Paul Karais")
      // Try exact match first, then "FirstName %" to avoid "Paul" matching "Paulin Something"
      let resolvedId: string | null = null

      const { data: exact } = await admin
        .from("profiles")
        .select("id")
        .ilike("full_name", staffName)
        .maybeSingle()
      if (exact?.id) {
        resolvedId = exact.id
      } else {
        const { data: prefix } = await admin
          .from("profiles")
          .select("id")
          .ilike("full_name", `${staffName} %`)
          .limit(1)
          .maybeSingle()
        if (prefix?.id) resolvedId = prefix.id
      }

      if (!resolvedId) {
        throw new Error(`Staff member "${staffName}" not found in staff directory or profiles. Ensure they are listed in the staff directory with a linked profile.`)
      }
      normalizedUserId = normalizeAssigneeId(resolvedId)
    }
  }

  // Find or create a daily shift event for this date
  const eventTitle = `Daily Shift ${dateStr}`
  const { data: existingEvent } = await admin
    .from("events")
    .select("id")
    .eq("title", eventTitle)
    .maybeSingle()

  let eventId = existingEvent?.id

  if (!eventId) {
    const eventStart = shiftStart
      ? new Date(`${dateStr}T${shiftStart}:00-05:00`)
      : new Date(`${dateStr}T09:00:00-05:00`)
    const eventEnd = shiftEnd
      ? new Date(`${dateStr}T${shiftEnd}:00-05:00`)
      : new Date(`${dateStr}T17:00:00-05:00`)

    const { data: created, error: createErr } = await admin.from("events").insert({
      title: eventTitle,
      start_time: eventStart.toISOString(),
      end_time: eventEnd.toISOString(),
      description: `Daily operations shift — ${dateStr}`,
      required_ops: 1,
      required_security: 1,
      required_greeter: 0,
      director_mandatory: false,
      category: "standard",
    }).select("id").single()

    if (createErr) throw new Error("Event insert failed: " + createErr.message)
    eventId = created?.id
  }

  if (!eventId) throw new Error("Failed to create or find day shift event")

  // Delete existing assignment for this user + event
  await admin
    .from("staff_assignments")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", normalizedUserId)

  // If marking OFF: insert a record with null shift times so the overlay can override
  // the static baseline schedule and show this person as explicitly OFF.
  if (!shiftStart || !shiftEnd) {
    const { error: offError } = await admin.from("staff_assignments").insert({
      event_id: eventId,
      user_id: normalizedUserId,
      role_assigned: role,
      shift_start: null,
      shift_end: null,
    })
    if (offError) throw new Error("Mark-off insert failed: " + offError.message)
    return { success: true, markedOff: true }
  }

  // Store times as UTC-naive (append Z) so the HH:MM round-trips correctly.
  // Applying a -05:00 offset here caused retrieved times to be 5 hours off (09:00 → displayed as 14:00).
  const shiftStartIso = `${dateStr}T${shiftStart}:00.000Z`
  const shiftEndIso = `${dateStr}T${shiftEnd}:00.000Z`

  const { data, error } = await admin.from("staff_assignments").insert({
    event_id: eventId,
    user_id: normalizedUserId,
    role_assigned: role,
    shift_start: shiftStartIso,
    shift_end: shiftEndIso,
  }).select("*").single()

  if (error) throw new Error("Assignment insert failed: " + error.message)
  return { success: true, assignment: data }
}

// ─── Seed static schedule into staff_assignments ───

export async function seedWeekSchedule(
  weekStart: string,
  weekEnd: string
): Promise<{ seeded: number; skipped: number; errors: string[] }> {
  await requireManager()
  const admin = createAdminClient()
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")

  const entries = getScheduleForDateRange(weekStart, weekEnd)
  if (entries.length === 0) {
    return { seeded: 0, skipped: 0, errors: ["No static schedule data found for this week."] }
  }

  // Batch-load profiles and directory for name → user_id resolution
  const { data: profiles } = await admin.from("profiles").select("id, full_name")
  const { data: directory } = await admin.from("staff_directory").select("profile_id, name").not("profile_id", "is", null)
  const dirMap = new Map((directory || []).map(d => [d.name.toLowerCase(), d.profile_id as string]))
  const profileList = profiles || []

  function resolveUserId(staffName: string): string {
    const dirEntry = dirMap.get(staffName.toLowerCase())
    if (dirEntry) return normalizeAssigneeId(dirEntry)
    const exact = profileList.find(p => p.full_name?.toLowerCase() === staffName.toLowerCase())
    if (exact?.id) return normalizeAssigneeId(exact.id)
    const prefix = profileList.find(p => p.full_name?.toLowerCase().startsWith(staffName.toLowerCase() + " "))
    if (prefix?.id) return normalizeAssigneeId(prefix.id)
    return normalizeAssigneeId(deterministicUuid(staffName))
  }

  // Find or create a daily shift event for each date in the range
  const dates = Array.from(new Set(entries.map(e => e.date)))
  const eventTitles = dates.map(d => `Daily Shift ${d}`)
  const { data: existingEvents } = await admin
    .from("events")
    .select("id, title")
    .in("title", eventTitles)

  const eventMap = new Map((existingEvents || []).map(e => [e.title as string, e.id as number]))

  for (const date of dates) {
    const title = `Daily Shift ${date}`
    if (!eventMap.has(title)) {
      const { data: created } = await admin.from("events").insert({
        title,
        start_time: `${date}T09:00:00.000Z`,
        end_time: `${date}T17:00:00.000Z`,
        description: `Daily operations shift — ${date}`,
        required_ops: 1,
        required_security: 1,
        required_greeter: 0,
        director_mandatory: false,
        category: "standard",
      }).select("id").single()
      if (created?.id) eventMap.set(title, created.id)
    }
  }

  let seeded = 0
  let skipped = 0
  const errors: string[] = []

  for (const entry of entries) {
    const eventId = eventMap.get(`Daily Shift ${entry.date}`)
    if (!eventId) { skipped++; continue }

    const userId = resolveUserId(entry.staffName)
    const role = SCHEDULE_ROLE_MAP[entry.staffName] || "operations"

    // Skip if a record already exists — preserve any manual edits
    const { data: existing } = await admin
      .from("staff_assignments")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", userId)
      .maybeSingle()
    if (existing) { skipped++; continue }

    const shiftStartIso = entry.shiftStart ? `${entry.date}T${entry.shiftStart}:00.000Z` : null
    const shiftEndIso = entry.shiftEnd ? `${entry.date}T${entry.shiftEnd}:00.000Z` : null

    const { error } = await admin.from("staff_assignments").insert({
      event_id: eventId,
      user_id: userId,
      role_assigned: role,
      shift_start: shiftStartIso,
      shift_end: shiftEndIso,
    })

    if (error) {
      errors.push(`${entry.staffName} on ${entry.date}: ${error.message}`)
      skipped++
    } else {
      seeded++
    }
  }

  return { seeded, skipped, errors }
}

// ─── Copy previous week's schedule into the current week ───

export async function copyWeekFromPrevious(
  currentWeekStart: string
): Promise<{ copied: number; skipped: number; errors: string[] }> {
  await requireManager()
  const admin = createAdminClient()
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")

  // Compute previous week start/end (7 days back)
  const currDate = new Date(currentWeekStart + "T12:00:00Z")
  const prevDate = new Date(currDate)
  prevDate.setUTCDate(currDate.getUTCDate() - 7)
  const prevWeekStart = prevDate.toISOString().split("T")[0]
  const prevWeekEndDate = new Date(prevDate)
  prevWeekEndDate.setUTCDate(prevDate.getUTCDate() + 6)
  const prevWeekEnd = prevWeekEndDate.toISOString().split("T")[0]

  type SourceEntry = {
    date: string
    userId: string
    role: string
    shiftStart: string | null
    shiftEnd: string | null
  }
  const sourceEntries: SourceEntry[] = []

  // Try DB data for previous week first
  const prevTitles = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(prevDate)
    d.setUTCDate(prevDate.getUTCDate() + i)
    return `Daily Shift ${d.toISOString().split("T")[0]}`
  })

  const { data: prevEvents } = await admin
    .from("events")
    .select("id, title, start_time")
    .in("title", prevTitles)

  if (prevEvents && prevEvents.length > 0) {
    const prevEventIds = prevEvents.map(e => e.id)
    const { data: prevAssignments } = await admin
      .from("staff_assignments")
      .select("user_id, role_assigned, shift_start, shift_end, event_id")
      .in("event_id", prevEventIds)

    const eventDateMap = new Map(prevEvents.map(e => [e.id as number, e.start_time as string]))

    for (const a of prevAssignments || []) {
      const prevEventDate = eventDateMap.get(a.event_id)
      if (!prevEventDate) continue
      const prevDateStr = new Date(prevEventDate).toISOString().split("T")[0]
      // Shift date forward by 7 days
      const currEquiv = new Date(prevDateStr + "T12:00:00Z")
      currEquiv.setUTCDate(currEquiv.getUTCDate() + 7)
      const currDateStr = currEquiv.toISOString().split("T")[0]
      // Re-anchor the time to the new date (same HH:MM, different day)
      const startTime = a.shift_start ? new Date(a.shift_start).toISOString().slice(11, 16) : null
      const endTime = a.shift_end ? new Date(a.shift_end).toISOString().slice(11, 16) : null
      sourceEntries.push({
        date: currDateStr,
        userId: a.user_id,
        role: a.role_assigned || "operations",
        shiftStart: startTime ? `${currDateStr}T${startTime}:00.000Z` : null,
        shiftEnd: endTime ? `${currDateStr}T${endTime}:00.000Z` : null,
      })
    }
  }

  // Fallback to static schedule if no DB data for previous week
  if (sourceEntries.length === 0) {
    const staticEntries = getScheduleForDateRange(prevWeekStart, prevWeekEnd)
    if (staticEntries.length === 0) {
      return { copied: 0, skipped: 0, errors: ["No schedule data found for the previous week to copy from."] }
    }
    const { data: profiles } = await admin.from("profiles").select("id, full_name")
    const { data: directory } = await admin.from("staff_directory").select("profile_id, name").not("profile_id", "is", null)
    const dirMap = new Map((directory || []).map(d => [d.name.toLowerCase(), d.profile_id as string]))
    const profileList = profiles || []

    for (const entry of staticEntries) {
      const prevDt = new Date(entry.date + "T12:00:00Z")
      const currDt = new Date(prevDt)
      currDt.setUTCDate(prevDt.getUTCDate() + 7)
      const currDateStr = currDt.toISOString().split("T")[0]

      const dirEntry = dirMap.get(entry.staffName.toLowerCase())
      let userId: string
      if (dirEntry) {
        userId = normalizeAssigneeId(dirEntry)
      } else {
        const exact = profileList.find(p => p.full_name?.toLowerCase() === entry.staffName.toLowerCase())
        if (exact?.id) {
          userId = normalizeAssigneeId(exact.id)
        } else {
          const prefix = profileList.find(p => p.full_name?.toLowerCase().startsWith(entry.staffName.toLowerCase() + " "))
          userId = normalizeAssigneeId(prefix?.id || deterministicUuid(entry.staffName))
        }
      }

      sourceEntries.push({
        date: currDateStr,
        userId,
        role: SCHEDULE_ROLE_MAP[entry.staffName] || "operations",
        shiftStart: entry.shiftStart ? `${currDateStr}T${entry.shiftStart}:00.000Z` : null,
        shiftEnd: entry.shiftEnd ? `${currDateStr}T${entry.shiftEnd}:00.000Z` : null,
      })
    }
  }

  // Find or create events for each day in the current week
  const currTitles = Array.from(new Set(sourceEntries.map(e => `Daily Shift ${e.date}`)))
  const { data: currEvents } = await admin
    .from("events")
    .select("id, title")
    .in("title", currTitles)

  const currEventMap = new Map((currEvents || []).map(e => [e.title as string, e.id as number]))

  for (const title of currTitles) {
    if (!currEventMap.has(title)) {
      const date = title.replace("Daily Shift ", "")
      const { data: created } = await admin.from("events").insert({
        title,
        start_time: `${date}T09:00:00.000Z`,
        end_time: `${date}T17:00:00.000Z`,
        description: `Daily operations shift — ${date}`,
        required_ops: 1,
        required_security: 1,
        required_greeter: 0,
        director_mandatory: false,
        category: "standard",
      }).select("id").single()
      if (created?.id) currEventMap.set(title, created.id)
    }
  }

  let copied = 0
  let skipped = 0
  const errors: string[] = []

  for (const entry of sourceEntries) {
    const eventId = currEventMap.get(`Daily Shift ${entry.date}`)
    if (!eventId) { skipped++; continue }

    // Skip if a record already exists — preserve any edits already made to this week
    const { data: existing } = await admin
      .from("staff_assignments")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", entry.userId)
      .maybeSingle()
    if (existing) { skipped++; continue }

    const { error } = await admin.from("staff_assignments").insert({
      event_id: eventId,
      user_id: entry.userId,
      role_assigned: entry.role,
      shift_start: entry.shiftStart,
      shift_end: entry.shiftEnd,
    })

    if (error) {
      errors.push(`${entry.date}: ${error.message}`)
      skipped++
    } else {
      copied++
    }
  }

  return { copied, skipped, errors }
}

