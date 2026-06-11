"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { requireAuth, requireManager } from "./auth-helpers"
import { toEasternIso, easternToday, easternDate } from "@/lib/eastern-time"

export const submitWalkthrough = async (
  eventId: number | null,
  checks: Record<string, boolean>,
  type: "opening" | "closing" = "opening",
  category: "facility" | "security" = "facility",
  notes?: string,
  mediaUrls?: string[]
) => {
  const supabase = createServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  let user = authUser

  if (!user) {
    const hasDevBypass = cookies().get('shrine_dev_session')?.value === 'true'
    if (hasDevBypass && process.env.NODE_ENV === 'development') {
      const admin = createAdminClient()
      const { data: managerUser } = await admin.from("profiles").select("id").eq("role", "manager").limit(1).single()
      if (managerUser) {
        user = { id: managerUser.id } as any
      } else {
        const { data: anyUser } = await admin.from("profiles").select("id").limit(1).single()
        if (anyUser) user = { id: anyUser.id } as any
      }
    }
  }

  if (!user) throw new Error("Unauthorized. Please log in to your Supabase account to save operational data.")

  const admin = createAdminClient()
  const { data, error } = await admin.from("walkthroughs").insert({
    user_id: user.id,
    event_id: eventId,
    category,
    walkthrough_type: type,
    checks,
    notes,
    media_urls: mediaUrls || [],
  })

  if (error) throw new Error(error.message)
  return { success: true, data }
}

export async function deleteWalkthrough(id: string) {
  const user = await requireAuth()
  const admin = createAdminClient()

  // Verify user is manager or owns the walkthrough
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  const isManager = profile?.role === "manager" || profile?.role === "admin"

  if (!isManager) {
    const { data: wt } = await admin.from("walkthroughs").select("user_id").eq("id", id).single()
    if (wt?.user_id !== user.id) throw new Error("Unauthorized")
  }

  const { error } = await admin.from("walkthroughs").delete().eq("id", id)
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function getWalkthroughDetail(id: string) {
  await requireManager()
  const admin = createAdminClient()
  const { data, error } = await admin.from("walkthroughs").select("*").eq("id", id).single()
  if (error) throw new Error(error.message)
  return data
}

export async function clearAllWalkthroughs() {
  await requireManager()
  const admin = createAdminClient()

  // 1. Fetch ALL walkthroughs from the live table to archive
  const { data: allRows, error: fetchError } = await admin
    .from("walkthroughs")
    .select("id, user_id, event_id, category, walkthrough_type, checks, notes, media_urls, completed_at")
    .order("completed_at", { ascending: true })

  if (fetchError) throw new Error(fetchError.message)

  // 2. Archive every walkthrough using its own Eastern Time date
  const archiveRows = (allRows || []).map((row) => {
    const archiveDate = easternDate(row.completed_at)
    return {
      original_id: row.id,
      user_id: row.user_id,
      event_id: row.event_id,
      category: row.category,
      walkthrough_type: row.walkthrough_type,
      checks: row.checks,
      notes: row.notes,
      media_urls: row.media_urls,
      completed_at: row.completed_at,
      archive_date: archiveDate,
    }
  })

  if (archiveRows.length > 0) {
    const { error: archiveError } = await admin
      .from("walkthrough_archive")
      .upsert(archiveRows, { onConflict: "original_id" })
    if (archiveError) throw new Error(archiveError.message)
  }

  // 3. Delete ALL live rows (everything is now safely archived)
  const { error: deleteError } = await admin
    .from("walkthroughs")
    .delete()
    .not("id", "is", null)

  if (deleteError) throw new Error(deleteError.message)
  return { success: true, archived: archiveRows.length }
}

export async function getArchivedWalkthroughs(
  date: string,
  type?: "opening" | "closing",
  category?: "facility" | "security"
) {
  await requireManager()
  const admin = createAdminClient()

  let query = admin
    .from("walkthrough_archive")
    .select("id, original_id, user_id, event_id, category, walkthrough_type, checks, notes, media_urls, completed_at, archived_at")
    .eq("archive_date", date)
    .order("completed_at", { ascending: true })

  if (type) query = query.eq("walkthrough_type", type)
  if (category) query = query.eq("category", category)

  const { data, error } = await query

  if (error) throw new Error(error.message)

  // Batch-fetch user names for the archived walkthroughs
  const userIds = Array.from(new Set((data || []).map((w: any) => w.user_id).filter(Boolean)))
  let profileMap = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profiles } = await admin.from("profiles").select("id, full_name").in("id", userIds)
    profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]))
  }

  return (data || []).map((w: any) => ({
    ...w,
    user_name: profileMap.get(w.user_id) || null,
  }))
}

/**
 * One-time backfill: archive all walkthroughs currently in the live table
 * without deleting them. Use this if historical data was never archived.
 */
export async function backfillWalkthroughArchive() {
  await requireManager()
  const admin = createAdminClient()

  const { data: allRows, error: fetchError } = await admin
    .from("walkthroughs")
    .select("id, user_id, event_id, category, walkthrough_type, checks, notes, media_urls, completed_at")
    .order("completed_at", { ascending: true })

  if (fetchError) throw new Error(fetchError.message)

  const archiveRows = (allRows || []).map((row) => {
    const archiveDate = easternDate(row.completed_at)
    return {
      original_id: row.id,
      user_id: row.user_id,
      event_id: row.event_id,
      category: row.category,
      walkthrough_type: row.walkthrough_type,
      checks: row.checks,
      notes: row.notes,
      media_urls: row.media_urls,
      completed_at: row.completed_at,
      archive_date: archiveDate,
    }
  })

  if (archiveRows.length === 0) return { backfilled: 0 }

  const { error: archiveError } = await admin
    .from("walkthrough_archive")
    .upsert(archiveRows, { onConflict: "original_id" })

  if (archiveError) throw new Error(archiveError.message)
  return { backfilled: archiveRows.length }
}

export async function getArchivedWalkthroughDates(limit = 30) {
  await requireManager()
  const admin = createAdminClient()

  const { data, error } = await admin
    .from("walkthrough_archive")
    .select("archive_date")
    .order("archive_date", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  // Deduplicate dates
  const dates = Array.from(new Set((data || []).map((d: any) => d.archive_date)))
  return dates
}

export const getTodayWalkthrough = async (eventId: number | null, type?: "opening" | "closing") => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Constrain to today in Eastern Time — without this filter a walkthrough
  // from a previous day for the same event would suppress today's reminder.
  const todayEt = easternToday()
  const todayStart = new Date(toEasternIso(todayEt, "00:00")).toISOString()
  const todayEnd   = new Date(toEasternIso(todayEt, "23:59")).toISOString()

  let query = supabase
    .from("walkthroughs")
    .select("*")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .gte("completed_at", todayStart)
    .lte("completed_at", todayEnd)
    .order("completed_at", { ascending: false })
    .limit(1)

  if (type) {
    query = query.eq("walkthrough_type", type)
  }

  const { data, error } = await query.single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}
