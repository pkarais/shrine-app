"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { requireManager } from "./auth-helpers"
import { resolveCanonicalRole } from "@/lib/role-resolver"
import { toEasternIso } from "@/lib/eastern-time"
import { saveTemplateSnapshot } from "./schedule-template-snapshot"
import { createHash } from "crypto"
import { revalidatePath } from "next/cache"

// Shape of one shift the upload UI sends us (post-edit).
export type UploadedShift = {
  date: string             // YYYY-MM-DD
  staffName: string        // "Paul", "Fabio"
  scheduleRole: string     // "DIRECTOR" | "PORTER" | "GREETER" | "SECURITY"
  shiftStart: string | null  // "HH:mm" or null
  shiftEnd: string | null
}

export type UploadedDayHeader = {
  date: string
  dayTitle: string
}

export type CommitResult = {
  dailyShiftsInserted: number
  eventAssignmentsInserted: number
  datesProcessed: number
  matchedEvents: Array<{ date: string; dayTitle: string; eventId: number; eventTitle: string; assigned: number }>
  unmatchedHeaders: Array<{ date: string; dayTitle: string }>
  warnings: string[]
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function deterministicUuid(input: string) {
  const hash = createHash("sha1").update(input).digest("hex")
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}

function normalizeAssigneeId(rawId: string) {
  const v = String(rawId || "").trim()
  if (!v) return deterministicUuid("unknown")
  return isUuid(v) ? v : deterministicUuid(v)
}

function timeToIso(date: string, hhmm: string): string {
  // Schedule times in the PDF are Eastern Time. Store them with the
  // correct offset for that date (DST-aware).
  return toEasternIso(date, hhmm)
}

// Loose fuzzy match: strip punctuation, lowercase, then check overlap of
// significant words (>2 chars) between dayTitle and event title.
function fuzzyMatch(dayTitle: string, eventTitle: string): boolean {
  const norm = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 2)
  const a = new Set(norm(dayTitle))
  const b = norm(eventTitle)
  if (a.size === 0 || b.length === 0) return false
  // Match if at least one significant word from dayTitle appears in event title
  for (const w of b) if (a.has(w)) return true
  return false
}

export async function commitUploadedSchedule(
  shifts: UploadedShift[],
  dayHeaders: UploadedDayHeader[]
): Promise<CommitResult> {
  await requireManager()
  const admin = createAdminClient()
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured")

  const warnings: string[] = []
  if (shifts.length === 0) {
    return {
      dailyShiftsInserted: 0,
      eventAssignmentsInserted: 0,
      datesProcessed: 0,
      matchedEvents: [],
      unmatchedHeaders: [],
      warnings: ["No shifts to commit."],
    }
  }

  // ── 1. Resolve all staff names to user IDs in one batch ────────────────
  const { data: profiles } = await admin.from("profiles").select("id, full_name")
  const { data: directory } = await admin
    .from("staff_directory")
    .select("profile_id, name")
    .not("profile_id", "is", null)
  const dirMap = new Map((directory || []).map((d: any) => [String(d.name).toLowerCase(), d.profile_id as string]))
  const profileList = profiles || []

  // Track which names fell back to deterministic UUIDs so we can upsert
  // matching staff_directory rows below (so the calendar grid can resolve
  // user_id → name when looking up week assignments).
  const fallbackNameById = new Map<string, string>()

  function resolveUserId(name: string): string {
    const lower = name.toLowerCase()
    const dirHit = dirMap.get(lower)
    if (dirHit) return normalizeAssigneeId(dirHit)
    const exact = profileList.find((p: any) => (p.full_name || "").toLowerCase() === lower)
    if (exact?.id) return normalizeAssigneeId(exact.id)
    const prefix = profileList.find((p: any) =>
      (p.full_name || "").toLowerCase().startsWith(lower + " ")
    )
    if (prefix?.id) return normalizeAssigneeId(prefix.id)
    const fallback = normalizeAssigneeId(deterministicUuid(name))
    fallbackNameById.set(fallback, name)
    return fallback
  }

  // ── 2. Find distinct dates and ensure Regular Shrine Open events exist ──────
  const dates = Array.from(new Set(shifts.map((s) => s.date))).sort()
  const titles = dates.map((d) => `Regular Shrine Open ${d}`)
  const { data: existingDaily } = await admin
    .from("events")
    .select("id, title")
    .in("title", titles)

  const dailyEventMap = new Map<string, number>(
    (existingDaily || []).map((e: any) => [e.title as string, e.id as number])
  )

  for (const date of dates) {
    const title = `Regular Shrine Open ${date}`
    if (!dailyEventMap.has(title)) {
      const { data: created } = await admin
        .from("events")
        .insert({
          title,
          start_time: toEasternIso(date, "09:00"),
          end_time: toEasternIso(date, "17:00"),
          description: `Regular shrine open hours — 9:00 AM – 5:00 PM ET`,
          required_ops: 1,
          required_security: 1,
          required_greeter: 0,
          director_mandatory: false,
          category: "standard",
        })
        .select("id")
        .single()
      if (created?.id) dailyEventMap.set(title, created.id)
    }
  }

  // ── 3. Wipe existing assignments on Daily Shift events in the range ────
  // Upload is source of truth — so the new schedule fully replaces any prior
  // Daily Shift assignments for these dates. Event-specific assignments
  // (Bible Study, Baptism, etc.) are NOT wiped here so manual additions
  // outside the upload survive; we only wipe & re-add the ones we infer
  // from this upload below.
  const dailyIdsInRange = Array.from(dailyEventMap.values())
  if (dailyIdsInRange.length > 0) {
    await admin.from("staff_assignments").delete().in("event_id", dailyIdsInRange)
  }

  // ── 4. Insert Daily Shift assignments from the upload ──────────────────
  // OFF days get an explicit row with null shift_start/shift_end so they
  // OVERRIDE the static schedule template that the calendar grid overlays
  // — otherwise the static "Paul 8–4" leaks through when the PDF says OFF.
  let dailyShiftsInserted = 0
  const dailyRows: any[] = []
  for (const sh of shifts) {
    const eventId = dailyEventMap.get(`Regular Shrine Open ${sh.date}`)
    if (!eventId) continue
    const userId = resolveUserId(sh.staffName)
    const role = resolveCanonicalRole(sh.scheduleRole, sh.staffName)
    const isOff = !sh.shiftStart || !sh.shiftEnd
    dailyRows.push({
      event_id: eventId,
      user_id: userId,
      role_assigned: role,
      shift_start: isOff ? null : timeToIso(sh.date, sh.shiftStart!),
      shift_end: isOff ? null : timeToIso(sh.date, sh.shiftEnd!),
    })
  }
  if (dailyRows.length > 0) {
    const { error } = await admin.from("staff_assignments").insert(dailyRows)
    if (error) warnings.push(`Daily insert error: ${error.message}`)
    else dailyShiftsInserted = dailyRows.length
  }

  // ── 4b. Upsert staff_directory rows for names that fell back to a
  // deterministic UUID. Without these rows, the calendar's week-schedule
  // lookup (getWeekScheduleAssignments) can't resolve user_id back to a
  // display name and the shift silently disappears from the grid.
  if (fallbackNameById.size > 0) {
    const dirRows = Array.from(fallbackNameById.entries()).map(([id, name]) => ({
      profile_id: id,
      name,
    }))
    // onConflict: profile_id (assumes unique constraint). If schema lacks
    // the constraint we still get a normal insert that may collide — swallow
    // duplicate-key errors silently because they mean the row already exists.
    const { error: dirErr } = await admin
      .from("staff_directory")
      .upsert(dirRows, { onConflict: "profile_id", ignoreDuplicates: true })
    if (dirErr && !/duplicate key/i.test(dirErr.message)) {
      warnings.push(`Staff directory upsert warning: ${dirErr.message}`)
    }
  }

  // ── 5. Auto-assign coverage to every non-infra event on each upload date
  // ── Sunday Divine Liturgy, Bible Study, Baptism, etc. all get coverage
  // ── from any staff whose shift overlaps the event window, regardless of
  // ── whether the PDF day header had a matching title.
  const matchedEvents: CommitResult["matchedEvents"] = []
  const unmatchedHeaders: CommitResult["unmatchedHeaders"] = []
  let eventAssignmentsInserted = 0

  if (dates.length > 0) {
    const minDate = dates[0]
    const maxDate = dates[dates.length - 1]
    const { data: realEvents } = await admin
      .from("events")
      .select("id, title, start_time, end_time, required_ops, required_security, required_greeter, director_mandatory")
      .gte("start_time", `${minDate}T00:00:00.000Z`)
      .lte("start_time", `${maxDate}T23:59:59.999Z`)

    const realEventsByDate = new Map<string, any[]>()
    for (const ev of realEvents || []) {
      const d = String(ev.start_time).split("T")[0]
      if (!realEventsByDate.has(d)) realEventsByDate.set(d, [])
      realEventsByDate.get(d)!.push(ev)
    }

    // Headers we couldn't fuzzy-match — surface for manager visibility.
    const headersToMatch = dayHeaders.filter(
      (h) => h.dayTitle && h.dayTitle.replace(/\s+/g, "").length > 3
    )
    for (const hdr of headersToMatch) {
      const cands = (realEventsByDate.get(hdr.date) || []).filter(
        (e: any) =>
          !String(e.title || "").startsWith("Daily Shift") &&
          !String(e.title || "").startsWith("Regular Shrine Open") &&
          e.title !== "Staff Operational Window" &&
          e.title !== "Open for Tourism"
      )
      if (!cands.some((e: any) => fuzzyMatch(hdr.dayTitle, e.title))) {
        unmatchedHeaders.push(hdr)
      }
    }

    for (const date of dates) {
      const evCandidates = (realEventsByDate.get(date) || []).filter(
        (e: any) =>
          !String(e.title || "").startsWith("Daily Shift") &&
          !String(e.title || "").startsWith("Regular Shrine Open") &&
          e.title !== "Staff Operational Window" &&
          e.title !== "Open for Tourism"
      )
      if (evCandidates.length === 0) continue

      const sameDay = shifts.filter((s) => s.date === date && s.shiftStart && s.shiftEnd)
      if (sameDay.length === 0) continue

      for (const ev of evCandidates) {
        const evStart = new Date(ev.start_time)
        const evEnd = ev.end_time ? new Date(ev.end_time) : new Date(evStart.getTime() + 2 * 60 * 60 * 1000)
        const evStartMin = evStart.getUTCHours() * 60 + evStart.getUTCMinutes()
        const evEndMin = evEnd.getUTCHours() * 60 + evEnd.getUTCMinutes()

        const eventRows: any[] = []
        for (const sh of sameDay) {
          const [sh1, sm1] = sh.shiftStart!.split(":").map(Number)
          const [sh2, sm2] = sh.shiftEnd!.split(":").map(Number)
          const sMin = sh1 * 60 + sm1
          const eMin = sh2 * 60 + sm2
          if (eMin <= evStartMin || sMin >= evEndMin) continue

          const role = resolveCanonicalRole(sh.scheduleRole, sh.staffName)
          // Greeters only cover open-hours events; skip if event starts after
          // 17:00 (typical liturgical evening services don't need a greeter).
          if (role === "greeter" && evStartMin >= 17 * 60) continue

          eventRows.push({
            event_id: ev.id,
            user_id: resolveUserId(sh.staffName),
            role_assigned: role,
            shift_start: timeToIso(sh.date, sh.shiftStart!),
            shift_end: timeToIso(sh.date, sh.shiftEnd!),
          })
        }

        if (eventRows.length > 0) {
          await admin.from("staff_assignments").delete().eq("event_id", ev.id)
          const { error } = await admin.from("staff_assignments").insert(eventRows)
          if (!error) {
            eventAssignmentsInserted += eventRows.length
            const hdr = dayHeaders.find((h) => h.date === date)
            matchedEvents.push({
              date,
              dayTitle: hdr?.dayTitle || "",
              eventId: ev.id,
              eventTitle: ev.title,
              assigned: eventRows.length,
            })
          } else {
            warnings.push(`Event ${ev.title} insert error: ${error.message}`)
          }
        }
      }
    }
  }

  // ── 6. Refresh server-rendered pages that read these rows. ─────────────
  try {
    revalidatePath("/calendar")
    revalidatePath("/calendar/[date]", "page")
    revalidatePath("/manager")
    revalidatePath("/dashboard")
    revalidatePath("/operations-brief")
  } catch {
    // best-effort — revalidatePath throws outside request scope, which
    // shouldn't happen here but be safe.
  }

  // ── 7. Persist this upload as the "latest template snapshot" in the
  // ── Supabase Storage bucket. The Seed Template button reads this back
  // ── so future weeks default to the most recent real schedule instead
  // ── of the hardcoded employee-schedules.ts fallback.
  const snapErr = await saveTemplateSnapshot({
    savedAt: new Date().toISOString(),
    uploadedDates: dates,
    shifts: shifts.map((s) => ({
      date: s.date,
      staffName: s.staffName,
      scheduleRole: s.scheduleRole,
      shiftStart: s.shiftStart,
      shiftEnd: s.shiftEnd,
    })),
  })
  if (snapErr) warnings.push(snapErr)

  return {
    dailyShiftsInserted,
    eventAssignmentsInserted,
    datesProcessed: dates.length,
    matchedEvents,
    unmatchedHeaders,
    warnings,
  }
}


// -------------------------------------------------------------------------
// createEventFromUnmatchedHeader
//
// Convert a "no matching calendar event" header row from the upload result
// screen into a real row in the events table so subsequent uploads can
// auto-assign coverage to it. Used by the "Add to calendar" button on the
// upload result page.
// -------------------------------------------------------------------------
export type CreateEventFromHeaderArgs = {
  date: string      // YYYY-MM-DD (ET)
  dayTitle: string  // raw header text, e.g. 'Regular Open 9:am-5:pm'
}

export type CreateEventFromHeaderResult = {
  eventId: number
  title: string
  startTime: string
  endTime: string
  alreadyExisted: boolean
}

// Parse a free-form schedule day-header like "Regular Open 9:am-5:pm"
// or "Regular open 9-5" into a start/end HH:mm pair. Falls back to 09:00-17:00.
function parseHeaderTimes(dayTitle: string): { startHHmm: string; endHHmm: string } {
  const t = (dayTitle || "").toLowerCase().replace(/\s+/g, "")
  // Match patterns like 9:am-5:pm, 9am-5pm, 9-5, 9:00-17:00, 9:30am-5:30pm
  const re = /(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?\s*[-�to]+\s*(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?/i
  const m = t.match(re)
  if (!m) return { startHHmm: "09:00", endHHmm: "17:00" }
  let sH = parseInt(m[1], 10)
  const sM = m[2] ? parseInt(m[2], 10) : 0
  const sMer = m[3]
  let eH = parseInt(m[4], 10)
  const eM = m[5] ? parseInt(m[5], 10) : 0
  const eMer = m[6]
  // Apply am/pm. If neither end specified meridiems and looks like 9-5, treat
  // start as AM and end as PM (typical operating hours).
  if (sMer === "pm" && sH < 12) sH += 12
  if (sMer === "am" && sH === 12) sH = 0
  if (eMer === "pm" && eH < 12) eH += 12
  if (eMer === "am" && eH === 12) eH = 0
  if (!sMer && !eMer && sH >= 1 && sH <= 12 && eH >= 1 && eH <= 12 && eH <= sH) {
    // "9-5" with no meridiems → 9 am - 5 pm (standard operating hours)
    eH += 12
  }
  const pad = (n: number) => String(Math.max(0, Math.min(23, n))).padStart(2, "0")
  return {
    startHHmm: `${pad(sH)}:${String(sM).padStart(2, "0")}`,
    endHHmm: `${pad(eH)}:${String(eM).padStart(2, "0")}`,
  }
}

export async function createEventFromUnmatchedHeader(
  args: CreateEventFromHeaderArgs
): Promise<CreateEventFromHeaderResult> {
  await requireManager()
  const admin = createAdminClient()
  const { date, dayTitle } = args
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date: ${date}`)
  }

  const cleanedTitle = (dayTitle || "").trim() || "Open for Tourism"
  // Strip any time tail so the stored title is short and reusable.
  const titleNoTime = cleanedTitle.replace(/\s*\d{1,2}(?::?\d{2})?\s*(am|pm)?\s*[-�to]+\s*\d{1,2}(?::?\d{2})?\s*(am|pm)?\s*$/i, "").trim() || cleanedTitle

  const { startHHmm, endHHmm } = parseHeaderTimes(cleanedTitle)
  const startIso = toEasternIso(date, startHHmm)
  const endIso = toEasternIso(date, endHHmm)

  // Try to find an existing same-day event with the same (cleaned) title
  // so repeat clicks are idempotent. Match by title prefix on the date.
  const dayStart = toEasternIso(date, "00:00")
  const nextDay = new Date(date + "T00:00:00Z")
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)
  const nextDayStr = nextDay.toISOString().slice(0, 10)
  const dayEnd = toEasternIso(nextDayStr, "00:00")

  // Pull ALL same-day events and do a normalized prefix/substring match.
  // The previous ilike(prefix%) check missed Google-synced rows whose titles
  // were truncated (~60 chars) or had trailing whitespace, which created
  // hundreds of duplicate event rows over time.
  const { data: existing, error: existErr } = await admin
    .from("events")
    .select("id, title, start_time, end_time")
    .gte("start_time", dayStart)
    .lt("start_time", dayEnd)
  if (existErr) throw new Error("Lookup failed: " + existErr.message)
  const normalize = (s: string) =>
    String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  const newNorm = normalize(titleNoTime)
  const newPrefix = newNorm.slice(0, 20)
  const match = (existing || []).find((row: any) => {
    if (row.title === "Staff Operational Window" || row.title === "Open for Tourism") return false
    if (/^Daily Shift |^Regular Shrine Open /.test(row.title)) return false
    const exNorm = normalize(row.title)
    if (!exNorm || newNorm.length < 6) return false
    const exPrefix = exNorm.slice(0, 20)
    return exNorm.includes(newPrefix) || newNorm.includes(exPrefix)
  })
  if (match) {
    return {
      eventId: match.id as number,
      title: match.title as string,
      startTime: match.start_time as string,
      endTime: (match.end_time as string) ?? endIso,
      alreadyExisted: true,
    }
  }

  const { data: created, error: createErr } = await admin
    .from("events")
    .insert({
      title: titleNoTime,
      description: `Auto-created from schedule upload on ${new Date().toISOString().slice(0, 10)}.`,
      start_time: startIso,
      end_time: endIso,
      category: "standard",
      required_ops: 1,
      required_security: 1,
      required_greeter: 1,
      director_mandatory: false,
    })
    .select("id, title, start_time, end_time")
    .single()
  if (createErr) throw new Error("Create failed: " + createErr.message)
  if (!created) throw new Error("Create returned no row")

  try {
    revalidatePath("/calendar")
    revalidatePath("/calendar/[date]", "page")
    revalidatePath("/manager")
  } catch {}

  return {
    eventId: created.id as number,
    title: created.title as string,
    startTime: created.start_time as string,
    endTime: (created.end_time as string) ?? endIso,
    alreadyExisted: false,
  }
}
