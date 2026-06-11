/**
 * Pure event-coverage evaluator.
 *
 * Source-of-truth model:
 *   - SHIFTS come from the uploaded bi-weekly schedule snapshot.
 *     They are NOT created by assigning staff to events.
 *   - EVENTS live on the calendar with role requirements
 *     (required_ops / required_security / required_greeter /
 *     director_mandatory).
 *   - COVERAGE is the per-event answer to "given the scheduled
 *     shifts on this date, who from the schedule is on duty during
 *     the event window, and does that meet the event's role
 *     requirements?"
 *   - ADD-ON COVERAGE is any explicit assignment (a `staff_assignments`
 *     row or future "extra coverage" row) made on top of the schedule.
 *     It is tracked separately so it never inflates shift counts.
 *
 * This file is intentionally pure (no Supabase, no `use server`)
 * so it can be unit tested and reused by the calendar UI, the
 * Command Center gap card, the daily brief, and the alert system.
 */

import type { DayShift } from "@/data/employee-schedules"

// Canonical role labels used everywhere downstream.
export type CoverageRole = "operations" | "security" | "greeter" | "director"

export type EventCoverageInput = {
  /** ISO timestamp of event start (timestamptz from `events.start_time`). */
  startTime: string
  /** ISO timestamp of event end. If missing, defaults to start + 60min. */
  endTime?: string | null
  requiredOps?: number | null
  requiredSecurity?: number | null
  requiredGreeter?: number | null
  directorMandatory?: boolean | null
}

export type ScheduledShiftInput = DayShift // { date, staffName, shiftStart, shiftEnd }

/**
 * Map from staff display name → their canonical operations role.
 * Comes from the schedule snapshot's `staffRoleMap` (Director / Porter /
 * Greeter / Security) and is normalized here to coverage roles.
 *
 * Callers may supply ad-hoc overrides via `roleOverrides` (e.g.
 * Demetri is sometimes printed as GREETER but always counts as
 * operations per ops directive).
 */
export type StaffRoleMap = Record<string, string>

const SCHEDULE_LABEL_TO_COVERAGE: Record<string, CoverageRole> = {
  director: "director",
  porter: "operations",
  operations: "operations",
  greeter: "greeter",
  security: "security",
}

const DEFAULT_ROLE_OVERRIDES: Record<string, CoverageRole> = {
  // Demetri is occasionally tagged GREETER on the PDF but is always
  // operations in practice. Match by first-name lowercase.
  demetri: "operations",
}

export type CoverageContributor = {
  name: string
  role: CoverageRole
  /** Where the contribution came from. */
  source: "schedule" | "addon"
  /** HH:mm in Eastern Time, present only for schedule sources. */
  shiftStart?: string | null
  shiftEnd?: string | null
}

export type CoverageGap = {
  role: CoverageRole
  needed: number
  have: number
  fromSchedule: number
  fromAddOn: number
}

export type CoverageResult = {
  covered: boolean
  /** Empty if everything is satisfied. */
  gaps: CoverageGap[]
  /** Counts grouped by role and origin. */
  counts: Record<CoverageRole, { fromSchedule: number; fromAddOn: number; total: number }>
  /** Itemised who is contributing. */
  contributors: CoverageContributor[]
}

/* ------------------------------------------------------------------ */
/* Internals                                                          */
/* ------------------------------------------------------------------ */

function firstNameKey(name: string): string {
  return String(name || "").trim().split(/\s+/)[0].toLowerCase()
}

function resolveCoverageRole(
  staffName: string,
  staffRoleMap: StaffRoleMap,
  roleOverrides: Record<string, CoverageRole>,
): CoverageRole | null {
  const fk = firstNameKey(staffName)
  if (fk && roleOverrides[fk]) return roleOverrides[fk]
  const label = (staffRoleMap[staffName] || "").toString().trim().toLowerCase()
  if (label && SCHEDULE_LABEL_TO_COVERAGE[label]) return SCHEDULE_LABEL_TO_COVERAGE[label]
  return null
}

/**
 * Convert an HH:mm (Eastern) on a given YYYY-MM-DD (Eastern) into
 * minutes-since-epoch in UTC. Uses a 12:00 anchor to determine the
 * correct ET offset for that date so DST boundaries are handled.
 */
function easternHhmmToUtcMs(date: string, hhmm: string): number {
  // Reuse the same offset logic as `toEasternIso` but inline-light:
  // build a UTC date by offsetting against America/New_York.
  const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10))
  // Find ET offset at 12:00 on that date.
  const probeUtc = Date.UTC(
    parseInt(date.slice(0, 4), 10),
    parseInt(date.slice(5, 7), 10) - 1,
    parseInt(date.slice(8, 10), 10),
    12,
    0,
    0,
  )
  const probe = new Date(probeUtc)
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = dtf.formatToParts(probe)
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value)
  let probeHour = get("hour")
  if (probeHour === 24) probeHour = 0
  const etAsUtc = Date.UTC(get("year"), get("month") - 1, get("day"), probeHour, get("minute"))
  const offsetMs = probeUtc - etAsUtc // positive: UTC is ahead of ET (300/240 min × 60 × 1000)
  // Now compute the desired HH:mm in ET as UTC ms.
  return (
    Date.UTC(
      parseInt(date.slice(0, 4), 10),
      parseInt(date.slice(5, 7), 10) - 1,
      parseInt(date.slice(8, 10), 10),
      h || 0,
      m || 0,
      0,
    ) + offsetMs
  )
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd
}

/* ------------------------------------------------------------------ */
/* Public API                                                         */
/* ------------------------------------------------------------------ */

export type EvaluateCoverageArgs = {
  event: EventCoverageInput
  /** Shifts scheduled on the event's date (after canonicalization). */
  scheduledShifts: ScheduledShiftInput[]
  /** Snapshot staffRoleMap (Director/Porter/Greeter/Security labels). */
  staffRoleMap: StaffRoleMap
  /**
   * Explicit add-on coverage assignments for this event
   * (e.g. extending Demetri to 8 PM to cover AHEPA). These never
   * count as new shifts; they exist purely as labels on the event.
   */
  addOnAssignments?: { staffName: string; role: CoverageRole }[]
  /** Optional first-name → coverage role overrides. */
  roleOverrides?: Record<string, CoverageRole>
}

export function evaluateEventCoverage(args: EvaluateCoverageArgs): CoverageResult {
  const { event, scheduledShifts, staffRoleMap } = args
  const overrides = { ...DEFAULT_ROLE_OVERRIDES, ...(args.roleOverrides || {}) }

  const eventStart = new Date(event.startTime).getTime()
  const eventEnd = event.endTime
    ? new Date(event.endTime).getTime()
    : eventStart + 60 * 60 * 1000

  // Event date in ET (YYYY-MM-DD) — needed to project HH:mm shifts.
  const etDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(eventStart))

  const counts: Record<CoverageRole, { fromSchedule: number; fromAddOn: number; total: number }> = {
    operations: { fromSchedule: 0, fromAddOn: 0, total: 0 },
    security: { fromSchedule: 0, fromAddOn: 0, total: 0 },
    greeter: { fromSchedule: 0, fromAddOn: 0, total: 0 },
    director: { fromSchedule: 0, fromAddOn: 0, total: 0 },
  }
  const contributors: CoverageContributor[] = []
  const seenSchedule = new Set<string>() // dedupe by name+role

  for (const shift of scheduledShifts) {
    if (!shift.shiftStart || !shift.shiftEnd) continue // OFF
    const role = resolveCoverageRole(shift.staffName, staffRoleMap, overrides)
    if (!role) continue

    const shiftStartMs = easternHhmmToUtcMs(etDate, shift.shiftStart)
    const shiftEndMs = easternHhmmToUtcMs(etDate, shift.shiftEnd)
    if (!intervalsOverlap(shiftStartMs, shiftEndMs, eventStart, eventEnd)) continue

    const key = `${shift.staffName.toLowerCase()}|${role}`
    if (seenSchedule.has(key)) continue
    seenSchedule.add(key)

    counts[role].fromSchedule += 1
    counts[role].total += 1
    contributors.push({
      name: shift.staffName,
      role,
      source: "schedule",
      shiftStart: shift.shiftStart,
      shiftEnd: shift.shiftEnd,
    })
  }

  // Add-on dedup: if a person already contributed via the schedule for
  // the same role, an add-on row for them is an artifact (the upload
  // pipeline pre-creates staff_assignments per scheduled-person × event
  // on that day). Don't double-count it.
  const seenAddOn = new Set<string>()
  for (const addOn of args.addOnAssignments || []) {
    const role = addOn.role
    if (!counts[role]) continue
    const key = `${(addOn.staffName || "").toLowerCase()}|${role}`
    if (seenSchedule.has(key)) continue
    if (seenAddOn.has(key)) continue
    seenAddOn.add(key)
    counts[role].fromAddOn += 1
    counts[role].total += 1
    contributors.push({ name: addOn.staffName, role, source: "addon" })
  }

  // Greeter coverage only matters during open hours (≤ 5 PM ET).
  // Past 5 PM the door is closed and greeters are not required even if
  // the event has required_greeter > 0.
  const etHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      hour12: false,
    }).format(new Date(eventStart)),
    10,
  )
  const greeterApplicable = etHour < 17

  const requirements: Record<CoverageRole, number> = {
    operations: Math.max(0, event.requiredOps ?? 0),
    security: Math.max(0, event.requiredSecurity ?? 0),
    greeter: greeterApplicable ? Math.max(0, event.requiredGreeter ?? 0) : 0,
    director: event.directorMandatory ? 1 : 0,
  }

  const gaps: CoverageGap[] = []
  ;(Object.keys(requirements) as CoverageRole[]).forEach((role) => {
    const needed = requirements[role]
    if (needed <= 0) return
    const have = counts[role].total
    if (have < needed) {
      gaps.push({
        role,
        needed,
        have,
        fromSchedule: counts[role].fromSchedule,
        fromAddOn: counts[role].fromAddOn,
      })
    }
  })

  return {
    covered: gaps.length === 0,
    gaps,
    counts,
    contributors,
  }
}
