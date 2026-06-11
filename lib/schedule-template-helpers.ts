/**
 * Pure helpers for schedule template snapshots (no server actions).
 * Kept separate from schedule-template-snapshot.ts so it can export
 * synchronous functions without violating Next's "use server" rule.
 */

import type { TemplateSnapshot, TemplateShift } from "./schedule-template-types"

/**
 * Build a Mon..Sun template map from the snapshot. Strategy: take the
 * MOST RECENT 7 days in the snapshot (so a two-week upload uses week 2),
 * and key each day's shifts by day-of-week (0=Sun..6=Sat).
 */
export function snapshotToWeeklyTemplate(
  snapshot: TemplateSnapshot
): Map<number, TemplateShift[]> {
  const byDate = new Map<string, TemplateShift[]>()
  for (const s of snapshot.shifts) {
    if (!byDate.has(s.date)) byDate.set(s.date, [])
    byDate.get(s.date)!.push(s)
  }
  const sortedDates = Array.from(byDate.keys()).sort()
  const last7 = sortedDates.slice(-7)
  const result = new Map<number, TemplateShift[]>()
  for (const d of last7) {
    const dow = new Date(d + "T12:00:00Z").getUTCDay()
    result.set(dow, byDate.get(d) || [])
  }
  return result
}
