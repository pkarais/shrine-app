"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { easternDate, easternHHMM, toEasternIso } from "@/lib/eastern-time"
import { getTemplateScheduleForRange } from "@/lib/actions/schedule-template-week"
import type { DayShift } from "@/data/employee-schedules"

/**
 * Live schedule = uploaded bi-weekly snapshot OVERLAID with manager
 * grid edits (`staff_assignments` rows attached to Regular Shrine Open
 * events). Edits win per (date, staffName).
 *
 * This is the single source of truth for "who is on the floor and when"
 * across the dashboard's Who's Working tab, the manager's coverage gap
 * card, and per-event coverage evaluation. By centralizing here all
 * surfaces tell the same story.
 *
 * Edits are NEVER counted as a separate shift — they replace the
 * corresponding snapshot entry for that person/date.
 */

const COVERAGE_TO_SCHEDULE_LABEL: Record<string, string> = {
  director: "Director",
  operations: "Operations",
  security: "Security",
  greeter: "Greeter",
}

async function fetchEditedCellsByDate(
  startDate: string,
  endDate: string,
): Promise<{ shiftsByDate: Record<string, DayShift[]>; roleByName: Record<string, string> }> {
  const admin = createAdminClient()
  const { data: openEvents } = await admin
    .from("events")
    .select("id, start_time")
    .like("title", "Regular Shrine Open %")
    .gte("start_time", new Date(toEasternIso(startDate, "00:00")).toISOString())
    .lte("start_time", new Date(toEasternIso(endDate, "23:59")).toISOString())

  const openIds = (openEvents || []).map((e: any) => e.id)
  if (openIds.length === 0) return { shiftsByDate: {}, roleByName: {} }

  const eventDateMap = new Map<number, string>()
  for (const e of openEvents || []) {
    eventDateMap.set(e.id as number, easternDate(e.start_time as string))
  }

  const { data: assignments } = await admin
    .from("staff_assignments")
    .select("event_id, user_id, role_assigned, shift_start, shift_end")
    .in("event_id", openIds)

  const userIds = Array.from(
    new Set((assignments || []).map((a: any) => a.user_id).filter(Boolean)),
  )

  // Resolve canonical short names (Fabio over Fabrizio Generoso).
  const shortNameByUserId = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: dirRows } = await admin
      .from("staff_directory")
      .select("profile_id, name")
      .in("profile_id", userIds)
    const byProfile = new Map<string, string[]>()
    for (const row of dirRows || []) {
      const pid = row.profile_id ? String(row.profile_id) : null
      const name = String(row.name || "").trim()
      if (!pid || !name) continue
      if (!byProfile.has(pid)) byProfile.set(pid, [])
      byProfile.get(pid)!.push(name)
    }
    for (const [pid, names] of Array.from(byProfile.entries())) {
      const singleWord = names.filter((n) => !/\s/.test(n))
      const canonical =
        (singleWord.length > 0 ? singleWord : names).sort((a, b) => a.length - b.length)[0]
      shortNameByUserId.set(pid, canonical)
    }
    const missing = userIds.filter((id) => !shortNameByUserId.has(id))
    if (missing.length > 0) {
      const { data: profs } = await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", missing)
      for (const p of profs || []) {
        const full = String(p.full_name || p.email || "").trim()
        if (!full) continue
        shortNameByUserId.set(p.id as string, full.split(/\s+/)[0])
      }
    }
  }

  const shiftsByDate: Record<string, DayShift[]> = {}
  const roleByName: Record<string, string> = {}

  for (const a of assignments || []) {
    const date = eventDateMap.get(a.event_id as number)
    if (!date) continue
    const name = shortNameByUserId.get(a.user_id as string)
    if (!name) continue
    const shiftStart = a.shift_start ? easternHHMM(a.shift_start as string) : null
    const shiftEnd = a.shift_end ? easternHHMM(a.shift_end as string) : null
    const list = shiftsByDate[date] || []
    const existing = list.findIndex((x) => x.staffName.toLowerCase() === name.toLowerCase())
    const entry: DayShift = { date, staffName: name, shiftStart, shiftEnd }
    if (existing >= 0) list[existing] = entry
    else list.push(entry)
    shiftsByDate[date] = list

    const roleKey = String(a.role_assigned || "").toLowerCase()
    const label = COVERAGE_TO_SCHEDULE_LABEL[roleKey]
    if (label && !roleByName[name]) roleByName[name] = label
  }

  return { shiftsByDate, roleByName }
}

function mergeEditsOntoSnapshot(
  snapshotByDate: Record<string, DayShift[]>,
  editsByDate: Record<string, DayShift[]>,
): Record<string, DayShift[]> {
  const out: Record<string, DayShift[]> = {}
  const dates = new Set<string>([...Object.keys(snapshotByDate), ...Object.keys(editsByDate)])
  for (const date of Array.from(dates)) {
    const base = snapshotByDate[date] || []
    const edits = editsByDate[date] || []
    const byName = new Map<string, DayShift>()
    for (const s of base) byName.set(s.staffName.toLowerCase(), s)
    for (const e of edits) byName.set(e.staffName.toLowerCase(), e)
    out[date] = Array.from(byName.values())
  }
  return out
}

export type LiveScheduleResult = {
  shiftsByDate: Record<string, DayShift[]>
  staffRoleMap: Record<string, string>
}

/**
 * Single source of truth for live scheduled shifts in [start, end].
 */
export async function getLiveScheduledShiftsForRange(
  startDate: string,
  endDate: string,
): Promise<LiveScheduleResult> {
  const [snapshot, edits] = await Promise.all([
    getTemplateScheduleForRange(startDate, endDate),
    fetchEditedCellsByDate(startDate, endDate),
  ])
  const shiftsByDate = mergeEditsOntoSnapshot(snapshot.shiftsByDate, edits.shiftsByDate)
  const staffRoleMap: Record<string, string> = { ...snapshot.staffRoleMap }
  for (const [name, label] of Object.entries(edits.roleByName)) {
    if (!staffRoleMap[name]) staffRoleMap[name] = label
  }
  return { shiftsByDate, staffRoleMap }
}
