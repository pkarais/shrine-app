"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { requireManager } from "@/lib/actions/auth-helpers"
import { easternDate, easternToday, toEasternIso } from "@/lib/eastern-time"
import { getTemplateScheduleForRange } from "@/lib/actions/schedule-template-week"

export type GapKind =
  | "schedule_only" // PDF schedule has someone, Google Calendar has no event
  | "calendar_only" // Google Calendar has events but no one is on the schedule

export interface StaffingGap {
  date: string // YYYY-MM-DD in ET
  weekday: string
  kind: GapKind
  scheduled_staff: { name: string; start: string | null; end: string | null }[]
  calendar_events: { title: string; start_time: string }[]
  severity: "high" | "medium" | "low"
}

function shiftDays(yyyymmdd: string, deltaDays: number): string {
  const iso = toEasternIso(yyyymmdd, "12:00")
  const dt = new Date(new Date(iso).getTime() + deltaDays * 24 * 60 * 60 * 1000)
  return easternDate(dt.toISOString())
}

function eachDate(start: string, end: string): string[] {
  const out: string[] = []
  let cur = start
  while (cur <= end) {
    out.push(cur)
    cur = shiftDays(cur, 1)
  }
  return out
}

function weekdayLabel(yyyymmdd: string): string {
  const iso = toEasternIso(yyyymmdd, "12:00")
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
  }).format(new Date(iso))
}

/**
 * Compare the uploaded PDF/Excel schedule against Google Calendar
 * events over the next N days (default 14) and surface days where the
 * two disagree. Church operates 7 days/week, so any day with PDF
 * coverage but zero calendar events is a gap the manager must
 * reconcile (either add the calendar event or note the day is closed).
 *
 * Conversely, days with calendar events but no scheduled staff are
 * "calendar_only" gaps and likely indicate a missing schedule upload
 * or an unplanned event.
 */
export async function detectStaffingGaps(daysAhead = 14): Promise<StaffingGap[]> {
  await requireManager()
  const admin = createAdminClient()

  const start = easternToday()
  const end = shiftDays(start, Math.max(1, daysAhead) - 1)

  const [{ data: events }, schedule] = await Promise.all([
    admin
      .from("events")
      .select("title, start_time")
      .gte("start_time", new Date(toEasternIso(start, "00:00")).toISOString())
      .lte("start_time", new Date(toEasternIso(end, "23:59")).toISOString()),
    getTemplateScheduleForRange(start, end),
  ])

  // Synthetic/internal events that should NOT count as real calendar coverage.
  // Including them causes every day to show hasEvents=true, masking real gaps.
  const SYNTHETIC_TITLES = new Set([
    "Regular Shrine Open",
    "Staff Operational Window",
    "Open for Tourism",
  ])

  // Bucket calendar events by ET date — skip synthetic titles.
  const eventsByDate = new Map<string, { title: string; start_time: string }[]>()
  for (const e of events || []) {
    const title = e.title || "(untitled)"
    if (SYNTHETIC_TITLES.has(title)) continue
    const day = easternDate(e.start_time as string)
    if (!eventsByDate.has(day)) eventsByDate.set(day, [])
    eventsByDate.get(day)!.push({ title, start_time: e.start_time as string })
  }

  const gaps: StaffingGap[] = []

  for (const date of eachDate(start, end)) {
    const dayShifts = (schedule.shiftsByDate[date] || []).filter(
      (s) => s.shiftStart && s.shiftEnd,
    )
    const dayEvents = eventsByDate.get(date) || []

    const hasSchedule = dayShifts.length > 0
    const hasEvents = dayEvents.length > 0

    if (hasSchedule && !hasEvents) {
      // PDF says staffed, calendar empty — most common gap.
      gaps.push({
        date,
        weekday: weekdayLabel(date),
        kind: "schedule_only",
        scheduled_staff: dayShifts.map((s) => ({
          name: s.staffName,
          start: s.shiftStart || null,
          end: s.shiftEnd || null,
        })),
        calendar_events: [],
        severity: date === start ? "high" : "medium",
      })
    } else if (!hasSchedule && hasEvents) {
      // Calendar has events but nobody is on the PDF — missing upload
      // or unplanned coverage need.
      gaps.push({
        date,
        weekday: weekdayLabel(date),
        kind: "calendar_only",
        scheduled_staff: [],
        calendar_events: dayEvents.slice(0, 8),
        severity: dayEvents.length >= 3 ? "high" : "medium",
      })
    }
  }

  return gaps
}
