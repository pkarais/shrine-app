"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { requireManager } from "@/lib/actions/auth-helpers"
import { easternDate, easternToday, toEasternIso } from "@/lib/eastern-time"
import { getLiveScheduledShiftsForRange } from "@/lib/actions/live-schedule"
import {
  evaluateEventCoverage,
  type CoverageResult,
  type CoverageRole,
} from "@/lib/event-coverage"

export type EventCoverageRow = {
  eventId: number
  title: string
  startTime: string
  endTime: string | null
  date: string // ET YYYY-MM-DD
  coverage: CoverageResult
  /** True when this event inherits coverage from a covering Regular Shrine Open window (open hours staff). */
  inheritedFromOpenWindow?: boolean
}

const OPEN_WINDOW_TITLE_PREFIX = "Regular Shrine Open"

function isOpenWindowTitle(title: string | null | undefined): boolean {
  return String(title || "").startsWith(OPEN_WINDOW_TITLE_PREFIX)
}

/**
 * If `evt` sits entirely within a covered Regular Shrine Open window
 * on the same date, return a Covered result that records the inheritance.
 * The premise: open-hours staff inherently covers anything scheduled
 * inside open hours; only after-hours events need dedicated coverage.
 */
function applyOpenWindowInheritance(
  row: EventCoverageRow,
  openWindows: EventCoverageRow[],
): EventCoverageRow {
  if (isOpenWindowTitle(row.title)) return row
  if (row.coverage.covered) return row
  const evtStart = new Date(row.startTime).getTime()
  const evtEnd = row.endTime ? new Date(row.endTime).getTime() : evtStart + 60 * 60 * 1000
  for (const win of openWindows) {
    if (win.date !== row.date) continue
    if (!win.coverage.covered) continue
    const winStart = new Date(win.startTime).getTime()
    const winEnd = win.endTime ? new Date(win.endTime).getTime() : winStart + 8 * 60 * 60 * 1000
    if (evtStart >= winStart && evtEnd <= winEnd) {
      return {
        ...row,
        inheritedFromOpenWindow: true,
        coverage: { ...row.coverage, covered: true, gaps: [] },
      }
    }
  }
  return row
}

function shiftDays(yyyymmdd: string, deltaDays: number): string {
  const iso = toEasternIso(yyyymmdd, "12:00")
  const dt = new Date(new Date(iso).getTime() + deltaDays * 24 * 60 * 60 * 1000)
  return easternDate(dt.toISOString())
}

const SKIP_TITLES = new Set(["Staff Operational Window", "Open for Tourism"])

const SUNDAY_ORTHROS_TITLE = "Orthos & Divine Liturgy"

/**
 * Stable negative pseudo-id for the synthetic Sunday Orthros event on a
 * given date. Keeps the id unique per date so callers that key by
 * eventId can mix synthetic + real events in one map.
 */
function syntheticOrthrosId(dateStr: string): number {
  return -1 * Number(dateStr.replace(/-/g, ""))
}

/**
 * Yields every Sunday (ET) date string in [startDate, endDate] inclusive.
 */
function sundayDatesInRange(startDate: string, endDate: string): string[] {
  const out: string[] = []
  let cursor = startDate
  while (cursor <= endDate) {
    const dow = new Date(toEasternIso(cursor, "12:00")).getUTCDay()
    if (dow === 0) out.push(cursor)
    cursor = shiftDays(cursor, 1)
  }
  return out
}

/**
 * Evaluate per-event coverage across [start, end] (ET dates).
 * Combines the snapshot schedule with explicit `staff_assignments`
 * rows (treated as add-on coverage labels — NEVER as new shifts).
 */
export async function getEventCoverageForRange(
  startDate: string,
  endDate: string,
): Promise<EventCoverageRow[]> {
  await requireManager()
  const admin = createAdminClient()

  const [{ data: events }, live] = await Promise.all([
    admin
      .from("events")
      .select(
        "id, title, start_time, end_time, required_ops, required_security, required_greeter, director_mandatory",
      )
      .gte("start_time", new Date(toEasternIso(startDate, "00:00")).toISOString())
      .lte("start_time", new Date(toEasternIso(endDate, "23:59")).toISOString())
      .order("start_time", { ascending: true }),
    getLiveScheduledShiftsForRange(startDate, endDate),
  ])

  const liveShiftsByDate = live.shiftsByDate
  const liveRoleMap = live.staffRoleMap

  const filtered = (events || []).filter((e: any) => !SKIP_TITLES.has(String(e.title || "")))

  // Inject synthetic Sunday Orthros events for any Sunday in the range
  // that doesn't already have one in the DB. Mirrors injectSundayOrthros
  // in lib/calendar-defaults.ts so the manager calendar's coverage badges
  // line up with what the timeline actually renders.
  const existingSundayOrthros = new Set<string>()
  for (const e of filtered) {
    if (String(e.title || "").trim() === SUNDAY_ORTHROS_TITLE) {
      existingSundayOrthros.add(easternDate(e.start_time as string))
    }
  }
  for (const sun of sundayDatesInRange(startDate, endDate)) {
    if (existingSundayOrthros.has(sun)) continue
    filtered.push({
      id: syntheticOrthrosId(sun),
      title: SUNDAY_ORTHROS_TITLE,
      start_time: new Date(toEasternIso(sun, "09:00")).toISOString(),
      end_time: new Date(toEasternIso(sun, "12:00")).toISOString(),
      required_ops: 0,
      required_security: 0,
      required_greeter: 0,
      director_mandatory: false,
    })
  }

  if (filtered.length === 0) return []

  // Batch fetch all explicit assignments for these events.
  const eventIds = filtered.map((e: any) => e.id)
  const { data: assignments } = await admin
    .from("staff_assignments")
    .select("event_id, user_id, role_assigned")
    .in("event_id", eventIds)

  // Resolve display names for assignment users (no FK joins).
  const userIds = Array.from(
    new Set((assignments || []).map((a: any) => a.user_id).filter(Boolean)),
  )
  const profileNames = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds)
    for (const p of profs || []) {
      profileNames.set(p.id as string, (p.full_name || p.email || "Staff") as string)
    }
  }

  const addOnsByEvent = new Map<number, { staffName: string; role: CoverageRole }[]>()
  for (const a of assignments || []) {
    const role = String(a.role_assigned || "").toLowerCase() as CoverageRole
    if (role !== "operations" && role !== "security" && role !== "greeter" && role !== "director") continue
    const name = profileNames.get(a.user_id as string) || "Staff"
    const list = addOnsByEvent.get(a.event_id as number) || []
    list.push({ staffName: name, role })
    addOnsByEvent.set(a.event_id as number, list)
  }

  const rows: EventCoverageRow[] = []
  for (const e of filtered) {
    const date = easternDate(e.start_time as string)
    const dayShifts = liveShiftsByDate[date] || []
    const coverage = evaluateEventCoverage({
      event: {
        startTime: e.start_time as string,
        endTime: (e.end_time as string) || null,
        requiredOps: e.required_ops as number | null,
        requiredSecurity: e.required_security as number | null,
        requiredGreeter: e.required_greeter as number | null,
        directorMandatory: e.director_mandatory as boolean | null,
      },
      scheduledShifts: dayShifts,
      staffRoleMap: liveRoleMap,
      addOnAssignments: addOnsByEvent.get(e.id as number) || [],
    })

    rows.push({
      eventId: e.id as number,
      title: (e.title as string) || "(untitled)",
      startTime: e.start_time as string,
      endTime: (e.end_time as string) || null,
      date,
      coverage,
    })
  }

  // Inheritance pass: events fully inside a covered Regular Shrine Open
  // window are presumed covered by open-hours staff and are NOT flagged.
  const openWindows = rows.filter((r) => isOpenWindowTitle(r.title))
  return rows.map((r) => applyOpenWindowInheritance(r, openWindows))
}

/**
 * Convenience: only events with unmet coverage.
 */
export async function getEventCoverageGaps(daysAhead = 14): Promise<EventCoverageRow[]> {
  const start = easternToday()
  const end = shiftDays(start, Math.max(1, daysAhead) - 1)
  const rows = await getEventCoverageForRange(start, end)
  return rows.filter((r) => !r.coverage.covered)
}

/**
 * Evaluate coverage for a single event (used by event detail UI).
 */
export async function getEventCoverage(eventId: number): Promise<EventCoverageRow | null> {
  await requireManager()
  const admin = createAdminClient()
  const { data: event } = await admin
    .from("events")
    .select(
      "id, title, start_time, end_time, required_ops, required_security, required_greeter, director_mandatory",
    )
    .eq("id", eventId)
    .single()
  if (!event) return null

  const date = easternDate(event.start_time as string)
  const live = await getLiveScheduledShiftsForRange(date, date)
  const liveShiftsByDate = live.shiftsByDate
  const liveRoleMap = live.staffRoleMap

  const { data: assignments } = await admin
    .from("staff_assignments")
    .select("user_id, role_assigned")
    .eq("event_id", eventId)

  const userIds = Array.from(new Set((assignments || []).map((a: any) => a.user_id).filter(Boolean)))
  const profileNames = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds)
    for (const p of profs || []) {
      profileNames.set(p.id as string, (p.full_name || p.email || "Staff") as string)
    }
  }

  const addOns: { staffName: string; role: CoverageRole }[] = []
  for (const a of assignments || []) {
    const role = String(a.role_assigned || "").toLowerCase() as CoverageRole
    if (role !== "operations" && role !== "security" && role !== "greeter" && role !== "director") continue
    addOns.push({ staffName: profileNames.get(a.user_id as string) || "Staff", role })
  }

  const coverage = evaluateEventCoverage({
    event: {
      startTime: event.start_time as string,
      endTime: (event.end_time as string) || null,
      requiredOps: event.required_ops as number | null,
      requiredSecurity: event.required_security as number | null,
      requiredGreeter: event.required_greeter as number | null,
      directorMandatory: event.director_mandatory as boolean | null,
    },
    scheduledShifts: liveShiftsByDate[date] || [],
    staffRoleMap: liveRoleMap,
    addOnAssignments: addOns,
  })

  const baseRow: EventCoverageRow = {
    eventId: event.id as number,
    title: (event.title as string) || "(untitled)",
    startTime: event.start_time as string,
    endTime: (event.end_time as string) || null,
    date,
    coverage,
  }

  // Pull the day's open-window events to allow inheritance.
  if (!isOpenWindowTitle(baseRow.title) && !coverage.covered) {
    const { data: openEvents } = await admin
      .from("events")
      .select(
        "id, title, start_time, end_time, required_ops, required_security, required_greeter, director_mandatory",
      )
      .like("title", `${OPEN_WINDOW_TITLE_PREFIX}%`)
      .gte("start_time", new Date(toEasternIso(date, "00:00")).toISOString())
      .lte("start_time", new Date(toEasternIso(date, "23:59")).toISOString())

    const openRows: EventCoverageRow[] = (openEvents || []).map((oe: any) => {
      const oCov = evaluateEventCoverage({
        event: {
          startTime: oe.start_time as string,
          endTime: (oe.end_time as string) || null,
          requiredOps: oe.required_ops as number | null,
          requiredSecurity: oe.required_security as number | null,
          requiredGreeter: oe.required_greeter as number | null,
          directorMandatory: oe.director_mandatory as boolean | null,
        },
        scheduledShifts: liveShiftsByDate[date] || [],
        staffRoleMap: liveRoleMap,
      })
      return {
        eventId: oe.id as number,
        title: (oe.title as string) || "",
        startTime: oe.start_time as string,
        endTime: (oe.end_time as string) || null,
        date,
        coverage: oCov,
      }
    })
    return applyOpenWindowInheritance(baseRow, openRows)
  }

  return baseRow
}

/**
 * Sync the `manager_alerts` table with the current set of event-coverage
 * gaps. Inserts one unacknowledged alert per uncovered event (deduped by
 * event_id) and auto-acknowledges existing alerts for events that are
 * now covered (or no longer in the lookahead window). Safe to call on
 * every Manager Command Center render.
 */
export async function syncEventCoverageAlerts(
  gaps: EventCoverageRow[],
): Promise<{ inserted: number; cleared: number }> {
  await requireManager()
  const admin = createAdminClient()

  // 1. Load existing OPEN coverage-gap alerts.
  const { data: existingAlerts } = await admin
    .from("manager_alerts")
    .select("id, metadata")
    .eq("alert_type", "event_coverage_gap")
    .eq("acknowledged", false)

  const existingByEventId = new Map<number, string>() // event_id -> alert_id
  for (const row of existingAlerts || []) {
    const eid = Number((row as any).metadata?.event_id)
    if (Number.isFinite(eid)) existingByEventId.set(eid, (row as any).id as string)
  }

  // 2. Build the set of currently-uncovered event ids (skip inherited).
  const currentGapEventIds = new Set<number>()
  const toInsert: any[] = []
  for (const gap of gaps) {
    if (gap.inheritedFromOpenWindow) continue
    if (gap.coverage.covered) continue
    currentGapEventIds.add(gap.eventId)
    if (existingByEventId.has(gap.eventId)) continue

    const missingParts: string[] = []
    for (const slot of gap.coverage.gaps) {
      const short = Math.max(0, slot.needed - slot.have)
      if (short > 0) missingParts.push(`${short} ${slot.role}`)
    }
    const dateLabel = new Date(gap.startTime).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
    })
    const message = `Coverage gap: ${gap.title} (${dateLabel}) — missing ${missingParts.join(", ") || "staff"}`

    toInsert.push({
      alert_type: "event_coverage_gap",
      message,
      severity: "warning",
      triggered_by: "System",
      triggered_by_role: "system",
      metadata: {
        event_id: gap.eventId,
        title: gap.title,
        date: gap.date,
        start_time: gap.startTime,
        end_time: gap.endTime,
        missing: missingParts,
      },
      acknowledged: false,
    })
  }

  // 3. Insert new alerts.
  let inserted = 0
  if (toInsert.length > 0) {
    const { error } = await admin.from("manager_alerts").insert(toInsert)
    if (!error) inserted = toInsert.length
    else console.error("syncEventCoverageAlerts insert failed:", error)
  }

  // 4. Auto-acknowledge alerts for events that are now covered/inherited
  //    or out of the lookahead window.
  const toClear: string[] = []
  for (const [eid, alertId] of Array.from(existingByEventId.entries())) {
    if (!currentGapEventIds.has(eid)) toClear.push(alertId)
  }
  let cleared = 0
  if (toClear.length > 0) {
    const { error } = await admin
      .from("manager_alerts")
      .update({ acknowledged: true, acknowledged_at: new Date().toISOString() })
      .in("id", toClear)
    if (!error) cleared = toClear.length
    else console.error("syncEventCoverageAlerts clear failed:", error)
  }

  return { inserted, cleared }
}
