"use server"
import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { toEasternIso } from "@/lib/eastern-time"

export async function createNotification(userId: string, title: string, body: string, type: string = "info", referenceId?: string) {
  // Always use admin client — bypasses RLS for both reads and writes.
  // User identity is verified by the calling server action via createServerClient.
  const admin = createAdminClient()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStr = todayStart.toISOString()

  // Dedup strategy:
  // For event-specific types (each award/deduction is a unique row): use type + referenceId.
  // For recurring types (shift reminders, break alerts, etc.): use type + title per day.
  // This is backward-compatible with legacy rows that have reference_id = NULL.
  const EVENT_SPECIFIC_TYPES = new Set(["badge_awarded", "points_deducted", "eom_nomination"])
  const useRefDedup = EVENT_SPECIFIC_TYPES.has(type) && !!referenceId

  // Check active table
  const activeQuery = admin
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .gte("created_at", todayStr)
  const { data: activeExisting } = await (useRefDedup
    ? activeQuery.eq("reference_id", referenceId).limit(1).maybeSingle()
    : activeQuery.eq("title", title).limit(1).maybeSingle())
  if (activeExisting) return { success: true }

  // Check archive (in case cleared today — prevents respawn after Clear)
  const archiveQuery = admin
    .from("notifications_archive")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .gte("original_created_at", todayStr)
  const { data: archivedExisting } = await (useRefDedup
    ? archiveQuery.eq("reference_id", referenceId).limit(1).maybeSingle()
    : archiveQuery.eq("title", title).limit(1).maybeSingle())
  if (archivedExisting) return { success: true }

  const { error } = await admin.from("notifications").insert({
    user_id: userId,
    title,
    body,
    type,
    reference_id: referenceId || null,
  })
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function getUnreadCount() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .is("read_at", null)
  return count || 0
}

export async function getNotifications(limit = 20) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data
}

export async function markNotificationRead(notificationId: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function markAllNotificationsRead() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null)
  if (error) throw new Error(error.message)
  return { success: true }
}

// Move ALL notifications to archive then delete from active table.
// Called by the "Clear" button. Rows in archive block re-insertion (dedup).
// Uses admin client to bypass RLS on the archive INSERT — user is verified via createServerClient first.
export async function archiveAllNotifications() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Use admin client so archive INSERT isn't blocked by RLS
  const admin = createAdminClient()

  const { data: allNotifs, error: fetchError } = await admin
    .from("notifications")
    .select("id, user_id, title, body, type, reference_id, created_at, read_at")
    .eq("user_id", user.id)

  if (fetchError) throw new Error(fetchError.message)
  if (!allNotifs || allNotifs.length === 0) return { success: true, archived: 0 }

  const now = new Date().toISOString()
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const archiveRows = allNotifs.map((n) => ({
    original_id: n.id,
    user_id: n.user_id,
    title: n.title,
    body: n.body,
    type: n.type,
    reference_id: n.reference_id ?? null,
    original_created_at: n.created_at,
    read_at: n.read_at ?? now,
    archived_at: now,
    expires_at: expires,
  }))

  const { error: archiveError } = await admin
    .from("notifications_archive")
    .insert(archiveRows)
  if (archiveError) throw new Error(archiveError.message)

  const ids = allNotifs.map((n) => n.id)
  const { error: deleteError } = await admin
    .from("notifications")
    .delete()
    .in("id", ids)
    .eq("user_id", user.id)
  if (deleteError) throw new Error(deleteError.message)

  return { success: true, archived: archiveRows.length }
}

// For Operations Brief: get archived notifications for a given month.
// Managers only — uses admin client to read across users.
export async function getArchivedNotificationsForMonth(year: number, month: number) {
  const admin = createAdminClient()
  // Build month boundaries in Eastern Time — new Date(year, month-1, 1) uses
  // the server's local timezone (UTC on Vercel) and would be off by several
  // hours relative to the NYC wall calendar.
  const monthStr = `${year}-${String(month).padStart(2, "0")}`
  const lastDay = new Date(year, month, 0).getDate() // pure calendar math
  const nextMonthStr = month === 12
    ? `${year + 1}-01`
    : `${year}-${String(month + 1).padStart(2, "0")}`
  const monthStart = toEasternIso(`${monthStr}-01`, "00:00")
  const monthEnd = toEasternIso(`${nextMonthStr}-01`, "00:00")
  const { data, error } = await admin
    .from("notifications_archive")
    .select("user_id, title, body, type, original_created_at")
    .gte("original_created_at", monthStart)
    .lt("original_created_at", monthEnd)
    .order("original_created_at", { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}
