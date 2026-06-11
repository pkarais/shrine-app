"use server"

import { cookies } from "next/headers"
import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { easternToday, toEasternIso, easternDate } from "@/lib/eastern-time"

export async function submitVisitorCount(eventId: number | null, count: number) {
  if (!Number.isFinite(count) || count < 0) {
    throw new Error("Visitor count must be a non-negative number.")
  }

  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const hasDevBypass = cookies().get("shrine_dev_session")?.value === "true"

  // Always use admin client so RLS never blocks the write
  const admin = createAdminClient()
  const recordedBy: string | null = user?.id || null

  // Visitor counts are SNAPSHOTS — "there are N visitors right now".
  // Submitting 350 after 323 means 350 is the current count, not 673.
  // Strategy: look for an existing row for this event + today (ET).
  // If one exists, UPDATE it in place so totals don't double-count.
  // If not, INSERT a fresh row.
  // We keep the history in the audit sense (recorded_at updates to now),
  // but the rollup aggregation also uses last-per-day so either path is safe.

  const todayEt = easternToday() // "YYYY-MM-DD"
  const todayStartUtc = new Date(`${todayEt}T00:00:00-05:00`).toISOString() // generous window
  const todayEndUtc   = new Date(`${todayEt}T23:59:59-04:00`).toISOString()

  // Find today's existing row for this event (or global if eventId is null)
  let existingQuery = admin
    .from("visitor_volume")
    .select("id")
    .gte("recorded_at", todayStartUtc)
    .lte("recorded_at", todayEndUtc)
    .order("recorded_at", { ascending: false })
    .limit(1)

  if (eventId) {
    existingQuery = existingQuery.eq("event_id", eventId)
  } else {
    existingQuery = existingQuery.is("event_id", null)
  }

  const { data: existing } = await existingQuery.maybeSingle()

  let result: any
  let error: any

  if (existing?.id) {
    // UPDATE — replace the count and refresh the timestamp
    const res = await admin
      .from("visitor_volume")
      .update({ count, recorded_by: recordedBy, recorded_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("id, count, recorded_at, event_id")
      .single()
    result = res.data
    error = res.error
  } else {
    // INSERT — first submission for this event today
    const res = await admin
      .from("visitor_volume")
      .insert({ event_id: eventId, count, recorded_by: recordedBy })
      .select("id, count, recorded_at, event_id")
      .single()
    result = res.data
    error = res.error
  }

  if (error) {
    if (error.message?.toLowerCase().includes("row-level security")) {
      throw new Error(
        "visitor_volume insert blocked by RLS. Run supabase/visitor-volume-rls.sql in Supabase SQL Editor.",
      )
    }
    throw new Error(error.message)
  }

  return { success: true, row: result }
}

export async function recordVisitorCount(eventId: number | null, count: number) {
  const result = await submitVisitorCount(eventId, count)
  return { success: result.success, record: result.row }
}

export async function getVisitorVolumeForEvent(eventId: number) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("visitor_volume")
    .select("*")
    .eq("event_id", eventId)
    .order("recorded_at", { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

export async function getVisitorVolumeToday() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminClient()
  const todayEt = easternToday()
  const dayStart = new Date(toEasternIso(todayEt, "00:00")).toISOString()
  const { data, error } = await admin
    .from("visitor_volume")
    .select("*")
    .gte("recorded_at", dayStart)
    .order("recorded_at", { ascending: true })
  if (error) throw new Error(error.message)
  return data
}

/**
 * Archive today's final visitor snapshots into visitor_volume_archive,
 * then delete only today's live rows from visitor_volume.
 *
 * This preserves historical data for week/month rollups while letting
 * each day's live chart start fresh.
 */
export async function clearVisitorVolume() {
  const { requireManager } = await import("./auth-helpers")
  await requireManager()
  const admin = createAdminClient()

  const todayEt = easternToday()
  const todayStartUtc = new Date(`${todayEt}T00:00:00-05:00`).toISOString()
  const todayEndUtc = new Date(`${todayEt}T23:59:59-04:00`).toISOString()

  // 1. Fetch today's rows so we can archive the last snapshot per event
  const { data: todayRows, error: fetchError } = await admin
    .from("visitor_volume")
    .select("id, event_id, count, recorded_at, recorded_by")
    .gte("recorded_at", todayStartUtc)
    .lte("recorded_at", todayEndUtc)
    .order("recorded_at", { ascending: true })

  if (fetchError) throw new Error(fetchError.message)

  // 2. Build last-snapshot-per-event map for today
  const lastByEvent = new Map<string | null, { count: number; recorded_at: string; recorded_by: string | null }>()
  for (const row of todayRows || []) {
    const key = row.event_id ?? null
    lastByEvent.set(key, {
      count: Number(row.count) || 0,
      recorded_at: row.recorded_at,
      recorded_by: row.recorded_by ?? null,
    })
  }

  // 3. Upsert archived snapshots for today
  const archiveRows = Array.from(lastByEvent.entries()).map(([eventId, snap]) => ({
    event_id: eventId,
    count: snap.count,
    archive_date: todayEt,
    recorded_at: snap.recorded_at,
    recorded_by: snap.recorded_by,
  }))

  if (archiveRows.length > 0) {
    const { error: archiveError } = await admin
      .from("visitor_volume_archive")
      .upsert(archiveRows, { onConflict: "archive_date,event_id" })
    if (archiveError) throw new Error(archiveError.message)
  }

  // 4. Delete only today's live rows (preserve all prior days)
  const { error: deleteError, count } = await admin
    .from("visitor_volume")
    .delete({ count: "exact" })
    .gte("recorded_at", todayStartUtc)
    .lte("recorded_at", todayEndUtc)

  if (deleteError) throw new Error(deleteError.message)
  return { cleared: count || 0, archived: archiveRows.length }
}

