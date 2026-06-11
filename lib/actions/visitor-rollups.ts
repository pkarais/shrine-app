"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { requireManager } from "@/lib/actions/auth-helpers"
import { easternDate, easternToday, toEasternIso } from "@/lib/eastern-time"

export type RollupScope = "today" | "week" | "biweek" | "month"

export interface VisitorRollup {
  scope: RollupScope
  label: string
  start: string // YYYY-MM-DD ET
  end: string // YYYY-MM-DD ET
  total: number
  days: number
  daysWithData: number
  averagePerDay: number
  peakDay: { date: string; count: number } | null
  peakHour: { hour: number; count: number } | null
  byDay: { date: string; total: number }[]
}

function shiftDays(yyyymmdd: string, deltaDays: number): string {
  // Walk by 24h from noon ET so DST transitions don't flip the day.
  const iso = toEasternIso(yyyymmdd, "12:00")
  const dt = new Date(new Date(iso).getTime() + deltaDays * 24 * 60 * 60 * 1000)
  return easternDate(dt.toISOString())
}

function scopeBounds(scope: RollupScope): { start: string; end: string; label: string } {
  const today = easternToday()
  switch (scope) {
    case "today":
      return { start: today, end: today, label: "Today" }
    case "week":
      return { start: shiftDays(today, -6), end: today, label: "Last 7 days" }
    case "biweek":
      return { start: shiftDays(today, -13), end: today, label: "Last 14 days" }
    case "month":
      return { start: shiftDays(today, -29), end: today, label: "Last 30 days" }
  }
}

/**
 * Aggregate visitor_volume rows for a scope. ET-aware: a row recorded at
 * 11pm Friday ET counts toward Friday, not Saturday UTC.
 */
export async function getVisitorTotals(scope: RollupScope): Promise<VisitorRollup> {
  await requireManager()
  const admin = createAdminClient()
  const { start, end, label } = scopeBounds(scope)

  // Pull a generous UTC window then bucket by ET date client-side. We
  // pad +/- 1 day so any ET row living in an adjacent UTC day is included.
  const startUtc = new Date(toEasternIso(shiftDays(start, -1), "00:00")).toISOString()
  const endUtc = new Date(toEasternIso(shiftDays(end, 1), "23:59")).toISOString()

  const { data, error } = await admin
    .from("visitor_volume")
    .select("count, recorded_at")
    .gte("recorded_at", startUtc)
    .lte("recorded_at", endUtc)
    .order("recorded_at", { ascending: true })

  if (error) {
    return {
      scope,
      label,
      start,
      end,
      total: 0,
      days: 1,
      daysWithData: 0,
      averagePerDay: 0,
      peakDay: null,
      peakHour: null,
      byDay: [],
    }
  }

  // Each row is a SNAPSHOT of the current visitor count at that moment —
  // not an incremental addition. Staff submit "there are 350 visitors now"
  // which replaces the previous count of 323, not adds to it.
  //
  // Correct aggregation:
  //   • Per day  → use the LAST (most recent) snapshot for that day
  //   • Total    → sum of the last-snapshot-per-day values
  //   • Peak hour → the hour of the single highest last-snapshot of each day
  //
  // Rows are already ordered ascending by recorded_at, so iterating forward
  // and overwriting byDay[day] gives us the last value naturally.

  // Track last snapshot per day (overwrite on each newer row)
  const lastSnapshotByDay = new Map<string, { count: number; recorded_at: string }>()

  for (const row of data || []) {
    const day = easternDate(row.recorded_at as string)
    if (day < start || day > end) continue
    // Later rows overwrite earlier ones — we end up with the final snapshot
    lastSnapshotByDay.set(day, { count: Number(row.count) || 0, recorded_at: row.recorded_at as string })
  }

  const byDay = new Map<string, number>()
  const byHour = new Map<number, number>()
  let total = 0

  for (const [day, snap] of Array.from(lastSnapshotByDay.entries())) {
    const count = snap.count
    total += count
    byDay.set(day, count)

    // Attribute the day's peak count to the hour of its final snapshot
    const hour = Number(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        hour12: false,
      }).format(new Date(snap.recorded_at)),
    ) % 24
    byHour.set(hour, (byHour.get(hour) || 0) + count)
  }

  // Build full date range (zeros included) for charting
  const byDayList: { date: string; total: number }[] = []
  let cursor = start
  while (cursor <= end) {
    byDayList.push({ date: cursor, total: byDay.get(cursor) || 0 })
    cursor = shiftDays(cursor, 1)
  }

  const peakDayEntry = Array.from(byDay.entries()).sort((a, b) => b[1] - a[1])[0]
  const peakHourEntry = Array.from(byHour.entries()).sort((a, b) => b[1] - a[1])[0]

  const days = byDayList.length || 1
  const daysWithData = byDay.size

  return {
    scope,
    label,
    start,
    end,
    total,
    days,
    daysWithData,
    averagePerDay: daysWithData > 0 ? Math.round(total / daysWithData) : 0,
    peakDay: peakDayEntry ? { date: peakDayEntry[0], count: peakDayEntry[1] } : null,
    peakHour: peakHourEntry ? { hour: peakHourEntry[0], count: peakHourEntry[1] } : null,
    byDay: byDayList,
  }
}

/**
 * Aggregate already-archived daily_brief_issues across a date range.
 * Used to compose biweekly payroll-period summaries from the daily
 * snapshots without re-querying live operational tables.
 */
export async function aggregateDailyBriefsForPeriod(
  startDate: string,
  endDate: string,
) {
  await requireManager()
  const admin = createAdminClient()

  const { data: briefs, error } = await admin
    .from("daily_brief_issues")
    .select("brief_date, content")
    .gte("brief_date", startDate)
    .lte("brief_date", endDate)
    .order("brief_date", { ascending: true })

  if (error || !briefs) {
    return {
      start: startDate,
      end: endDate,
      brief_count: 0,
      totals: {
        staff_on_duty: 0,
        walkthroughs_completed: 0,
        open_tickets: 0,
        incidents: 0,
        events: 0,
        visitors: 0,
      },
      peak_visitor_day: null as { date: string; count: number } | null,
      days: [] as { date: string; metrics: Record<string, number> }[],
    }
  }

  let staff = 0
  let walks = 0
  let tickets = 0
  let incidents = 0
  let events = 0
  let visitors = 0
  let peakDay: { date: string; count: number } | null = null

  const days = briefs.map((b: any) => {
    const m = (b.content?.metrics || {}) as Record<string, number>
    const v = Number(m.visitors_total || 0)
    staff += Number(m.staff_on_duty || 0)
    walks += Number(m.walkthroughs_completed || 0)
    tickets += Number(m.open_tickets || 0)
    incidents += Number(m.incidents || 0)
    events += Number(m.upcoming_events || 0)
    visitors += v
    if (!peakDay || v > peakDay.count) peakDay = { date: b.brief_date, count: v }
    return { date: b.brief_date as string, metrics: m }
  })

  return {
    start: startDate,
    end: endDate,
    brief_count: briefs.length,
    totals: {
      staff_on_duty: staff,
      walkthroughs_completed: walks,
      open_tickets: tickets,
      incidents,
      events,
      visitors,
    },
    peak_visitor_day: peakDay,
    days,
  }
}
