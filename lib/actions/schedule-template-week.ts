"use server"

/**
 * Resolve the "default" weekly schedule for any date range using the most
 * recent uploaded snapshot (PDF / Excel / CSV / paste). The snapshot is
 * keyed by day-of-week (Sun..Sat) so it repeats forever until a newer
 * upload replaces it. Only falls back to the hardcoded
 * `data/employee-schedules.ts` data if no upload has ever been saved.
 *
 * Output shape matches `DayShift` from `data/employee-schedules.ts` so it
 * can be a drop-in replacement everywhere the calendar UI consumed the
 * static schedule.
 *
 * NAMES: The snapshot may store first-name only ("Fabio"), a multi-cell
 * combined name ("Fabio Smith"), or both for the same person. We
 * normalize against `staff_directory.name` by case-insensitive first
 * word, so both forms collapse onto the directory's canonical name
 * (preferring whichever variant actually has shift data over OFF).
 */

import { createAdminClient } from "@/utils/supabase/server"
import { loadLatestTemplateSnapshot } from "./schedule-template-snapshot"
import { snapshotToWeeklyTemplate } from "@/lib/schedule-template-helpers"
import {
  getScheduleForDateRange,
  type DayShift,
} from "@/data/employee-schedules"

export type TemplateScheduleResult = {
  source: "snapshot" | "static" | "empty"
  shiftsByDate: Record<string, DayShift[]>
  staffRoleMap: Record<string, string> // staffName → canonical role label ("Director" | "Porter" | "Greeter" | "Security")
}

const SCHEDULE_ROLE_LABEL: Record<string, string> = {
  DIRECTOR: "Director",
  PORTER: "Porter",
  GREETER: "Greeter",
  SECURITY: "Security",
}

function eachDate(startDate: string, endDate: string): string[] {
  const out: string[] = []
  const d = new Date(startDate + "T12:00:00Z")
  const end = new Date(endDate + "T12:00:00Z")
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

function firstNameKey(name: string): string {
  return String(name || "").trim().split(/\s+/)[0].toLowerCase()
}

/**
 * Build a {alias-lowercase → canonical display name} map from
 * staff_directory. The directory deliberately stores TWO rows per
 * person (short name like "Fabio" and full name like "Fabrizio
 * Generoso") sharing one profile_id. For schedule display we always
 * collapse onto the SHORT single-word name so the grid stays compact
 * and the snapshot's full-name rows merge with the directory's short
 * name. Indexes every alias and every first-word so either form
 * resolves to the same canonical name.
 */
async function loadDirectoryAliases(): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  try {
    const admin = createAdminClient()
    if (!admin) return map
    const { data: rows } = await admin
      .from("staff_directory")
      .select("name, profile_id")
      .not("name", "is", null)

    // Group by profile_id so short + full name collapse into one bucket.
    const byProfile = new Map<string, string[]>()
    const orphans: string[] = [] // rows without a profile_id
    for (const r of rows || []) {
      const name = String(r.name || "").trim()
      if (!name) continue
      const pid = r.profile_id ? String(r.profile_id) : null
      if (pid) {
        if (!byProfile.has(pid)) byProfile.set(pid, [])
        byProfile.get(pid)!.push(name)
      } else {
        orphans.push(name)
      }
    }

    for (const names of Array.from(byProfile.values())) {
      // Prefer a single-word name as canonical (the short alias).
      const singleWord = names.filter((n) => !/\s/.test(n))
      const canonical =
        (singleWord.length > 0 ? singleWord : names).sort(
          (a, b) => a.length - b.length,
        )[0]
      for (const n of names) {
        map.set(n.toLowerCase(), canonical)
        const fk = firstNameKey(n)
        if (fk) map.set(fk, canonical)
      }
    }
    for (const n of orphans) {
      map.set(n.toLowerCase(), n)
      const fk = firstNameKey(n)
      if (fk && !map.has(fk)) map.set(fk, n)
    }
  } catch {
    // Storage / permission issues should not break the calendar.
  }
  return map
}

function canonicalize(rawName: string, aliases: Map<string, string>): string {
  const trimmed = String(rawName || "").trim()
  if (!trimmed) return rawName
  // Try the full input first (handles "Fabrizio Generoso" → "Fabio"),
  // then fall back to first-word matching (handles "Fabrizio" alone).
  const full = aliases.get(trimmed.toLowerCase())
  if (full) return full
  const first = aliases.get(firstNameKey(trimmed))
  if (first) return first
  return rawName
}

/**
 * Merge multiple snapshot rows for the same person (per date) into one,
 * preferring the entry that has actual shift times over an OFF entry.
 */
function mergeDayShifts(existing: DayShift | undefined, next: DayShift): DayShift {
  if (!existing) return next
  const existingHasShift = !!(existing.shiftStart && existing.shiftEnd)
  const nextHasShift = !!(next.shiftStart && next.shiftEnd)
  if (nextHasShift && !existingHasShift) return next
  return existing
}

export async function getTemplateScheduleForRange(
  startDate: string,
  endDate: string,
): Promise<TemplateScheduleResult> {
  const snapshot = await loadLatestTemplateSnapshot()
  const aliases = await loadDirectoryAliases()

  if (snapshot) {
    const weekly = snapshotToWeeklyTemplate(snapshot)
    // Build a direct date->shifts index so dates that exist in the snapshot
    // use their actual shifts instead of the DOW-projected "last week".
    // This fixes 2-week uploads where today is in week 1 but the projection
    // collapses to week 2.
    const snapshotByDate = new Map<string, typeof snapshot.shifts>()
    for (const sh of snapshot.shifts) {
      if (!snapshotByDate.has(sh.date)) snapshotByDate.set(sh.date, [])
      snapshotByDate.get(sh.date)!.push(sh)
    }
    const dates = eachDate(startDate, endDate)
    const shiftsByDate: Record<string, DayShift[]> = {}
    const staffRoleMap: Record<string, string> = {}

    for (const date of dates) {
      const direct = snapshotByDate.get(date)
      let dayShifts: typeof snapshot.shifts
      if (direct && direct.length > 0) {
        dayShifts = direct
      } else {
        const dow = new Date(date + "T12:00:00Z").getUTCDay()
        dayShifts = weekly.get(dow) || []
      }
      // Merge snapshot duplicates by canonical name per date.
      const byName = new Map<string, DayShift>()
      for (const sh of dayShifts) {
        const canonical = canonicalize(sh.staffName, aliases)
        const candidate: DayShift = {
          date,
          staffName: canonical,
          shiftStart: sh.shiftStart,
          shiftEnd: sh.shiftEnd,
        }
        byName.set(canonical, mergeDayShifts(byName.get(canonical), candidate))
        const label = SCHEDULE_ROLE_LABEL[sh.scheduleRole] || "Operations"
        if (!staffRoleMap[canonical]) {
          staffRoleMap[canonical] = label
        }
      }
      shiftsByDate[date] = Array.from(byName.values())
    }

    // Also fold in any staff who appear anywhere in the snapshot so the
    // grid renders their row even if every day this week is OFF.
    for (const sh of snapshot.shifts) {
      const canonical = canonicalize(sh.staffName, aliases)
      if (!staffRoleMap[canonical]) {
        staffRoleMap[canonical] =
          SCHEDULE_ROLE_LABEL[sh.scheduleRole] || "Operations"
      }
    }

    return { source: "snapshot", shiftsByDate, staffRoleMap }
  }

  // Fallback: static hardcoded data
  const staticShifts = getScheduleForDateRange(startDate, endDate)
  if (staticShifts.length === 0) {
    return { source: "empty", shiftsByDate: {}, staffRoleMap: {} }
  }

  const shiftsByDate: Record<string, DayShift[]> = {}
  for (const s of staticShifts) {
    const canonical = canonicalize(s.staffName, aliases)
    if (!shiftsByDate[s.date]) shiftsByDate[s.date] = []
    const list = shiftsByDate[s.date]
    const existingIdx = list.findIndex((x) => x.staffName === canonical)
    const candidate: DayShift = { ...s, staffName: canonical }
    if (existingIdx >= 0) {
      list[existingIdx] = mergeDayShifts(list[existingIdx], candidate)
    } else {
      list.push(candidate)
    }
  }
  return { source: "static", shiftsByDate, staffRoleMap: {} }
}
