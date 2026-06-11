"use server"

import { cookies } from "next/headers"
import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { easternToday, toEasternIso } from "@/lib/eastern-time"

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
 * Manager-only: delete every visitor_volume row so the chart starts
 * fresh. Used by the "Reset" button on the Visitor Volume card.
 */
export async function clearVisitorVolume() {
  const { requireManager } = await import("./auth-helpers")
  await requireManager()
  const admin = createAdminClient()
  const { error, count } = await admin
    .from("visitor_volume")
    .delete({ count: "exact" })
    .not("id", "is", null)
  if (error) throw new Error(error.message)
  return { cleared: count || 0 }
}

