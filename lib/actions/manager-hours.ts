"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { getLiveScheduledShiftsForRange } from "@/lib/actions/live-schedule"

export type ManagerHoursShift = {
  id: string
  event_id: number | null
  clock_in: string
  clock_out: string | null
  location_type: "onsite" | "offsite"
  hours: number
}

export type ManagerHoursArchive = {
  rangeLabel: string
  startISO: string
  endISO: string
  totalHours: number
  onsiteHours: number
  offsiteHours: number
  activeShiftIncluded: boolean
  byDay: Array<{ date: string; onsite: number; offsite: number; total: number }>
  shifts: ManagerHoursShift[]
}

function hoursBetween(start: string, end: string | null): number {
  const endMs = end ? new Date(end).getTime() : Date.now()
  const raw = (endMs - new Date(start).getTime()) / (1000 * 60 * 60)
  return Math.max(0, raw)
}

function easternDateKey(iso: string): string {
  // YYYY-MM-DD in America/New_York
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso))
  const y = parts.find((p) => p.type === "year")?.value
  const m = parts.find((p) => p.type === "month")?.value
  const d = parts.find((p) => p.type === "day")?.value
  return `${y}-${m}-${d}`
}

export async function getManagerHoursArchive(
  startISO: string,
  endISO: string,
  rangeLabel: string
): Promise<ManagerHoursArchive> {
  const supabaseAuth = createServerClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  if (!user) {
    return {
      rangeLabel,
      startISO,
      endISO,
      totalHours: 0,
      onsiteHours: 0,
      offsiteHours: 0,
      activeShiftIncluded: false,
      byDay: [],
      shifts: [],
    }
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("shifts")
    .select("id, event_id, clock_in, clock_out, location_type")
    .eq("user_id", user.id)
    .gte("clock_in", startISO)
    .lte("clock_in", endISO)
    .order("clock_in", { ascending: true })

  if (error || !data) {
    return {
      rangeLabel,
      startISO,
      endISO,
      totalHours: 0,
      onsiteHours: 0,
      offsiteHours: 0,
      activeShiftIncluded: false,
      byDay: [],
      shifts: [],
    }
  }

  const dayMap = new Map<string, { onsite: number; offsite: number; total: number }>()
  const shifts: ManagerHoursShift[] = []
  let onsiteHours = 0
  let offsiteHours = 0
  let activeShiftIncluded = false

  for (const row of data) {
    const locType: "onsite" | "offsite" = row.location_type === "offsite" ? "offsite" : "onsite"
    const h = hoursBetween(row.clock_in, row.clock_out)
    if (!row.clock_out) activeShiftIncluded = true

    if (locType === "offsite") offsiteHours += h
    else onsiteHours += h

    const dayKey = easternDateKey(row.clock_in)
    const bucket = dayMap.get(dayKey) || { onsite: 0, offsite: 0, total: 0 }
    if (locType === "offsite") bucket.offsite += h
    else bucket.onsite += h
    bucket.total += h
    dayMap.set(dayKey, bucket)

    shifts.push({
      id: row.id,
      event_id: row.event_id,
      clock_in: row.clock_in,
      clock_out: row.clock_out,
      location_type: locType,
      hours: h,
    })
  }

  const byDay = Array.from(dayMap.entries())
    .map(([date, b]) => ({ date, onsite: b.onsite, offsite: b.offsite, total: b.total }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  return {
    rangeLabel,
    startISO,
    endISO,
    totalHours: onsiteHours + offsiteHours,
    onsiteHours,
    offsiteHours,
    activeShiftIncluded,
    byDay,
    shifts,
  }
}

export async function updateShiftLocationType(
  shiftId: string,
  locationType: "onsite" | "offsite"
): Promise<{ success: boolean; error?: string }> {
  if (locationType !== "onsite" && locationType !== "offsite") {
    return { success: false, error: "Invalid location_type" }
  }

  const supabaseAuth = createServerClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const admin = createAdminClient()

  // Only managers may reclassify. Restrict to the caller's own shifts.
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (!profile || profile.role !== "manager") {
    return { success: false, error: "Forbidden" }
  }

  const { data: shift } = await admin
    .from("shifts")
    .select("id, user_id")
    .eq("id", shiftId)
    .single()
  if (!shift || shift.user_id !== user.id) {
    return { success: false, error: "Shift not found" }
  }

  const { error } = await admin
    .from("shifts")
    .update({ location_type: locationType })
    .eq("id", shiftId)

  if (error) return { success: false, error: error.message }

  revalidatePath("/manager/my-hours")
  return { success: true }
}

export type ScheduledHoursResult = {
  totalHours: number
  byDay: Record<string, number>
  canonicalName: string | null
}

/**
 * Sum the caller's SCHEDULED hours across [startISO, endISO] from the
 * live schedule (bi-weekly snapshot overlaid with manager grid edits).
 * Used by /manager/my-hours so an extended/edited shift shows up in the
 * scheduled-hours total even before the manager clocks in.
 */
export async function getManagerScheduledHours(
  startISO: string,
  endISO: string,
): Promise<ScheduledHoursResult> {
  const supabaseAuth = createServerClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()
  if (!user) return { totalHours: 0, byDay: {}, canonicalName: null }

  const admin = createAdminClient()

  // Resolve the caller's canonical short-name(s) the same way the live
  // schedule helper does, so we can match by name.
  const { data: dirRows } = await admin
    .from("staff_directory")
    .select("name")
    .eq("profile_id", user.id)
  let canonical: string | null = null
  const names = (dirRows || []).map((r: any) => String(r.name || "").trim()).filter(Boolean)
  if (names.length > 0) {
    const singleWord = names.filter((n) => !/\s/.test(n))
    canonical = (singleWord.length > 0 ? singleWord : names).sort((a, b) => a.length - b.length)[0]
  } else {
    const { data: prof } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single()
    const full = String(prof?.full_name || prof?.email || "").trim()
    if (full) canonical = full.split(/\s+/)[0]
  }
  if (!canonical) return { totalHours: 0, byDay: {}, canonicalName: null }

  const startDate = easternDateKey(startISO)
  const endDate = easternDateKey(endISO)
  const { shiftsByDate } = await getLiveScheduledShiftsForRange(startDate, endDate)

  const target = canonical.toLowerCase()
  const byDay: Record<string, number> = {}
  let totalHours = 0
  for (const [date, dayShifts] of Object.entries(shiftsByDate)) {
    for (const s of dayShifts) {
      if (!s.shiftStart || !s.shiftEnd) continue
      if (String(s.staffName).toLowerCase() !== target) continue
      const [sh, sm] = s.shiftStart.split(":").map(Number)
      const [eh, em] = s.shiftEnd.split(":").map(Number)
      const startMin = sh * 60 + sm
      let endMin = eh * 60 + em
      if (endMin <= startMin) endMin += 24 * 60 // overnight safety
      const h = Math.max(0, (endMin - startMin) / 60)
      byDay[date] = (byDay[date] || 0) + h
      totalHours += h
    }
  }

  return { totalHours, byDay, canonicalName: canonical }
}
