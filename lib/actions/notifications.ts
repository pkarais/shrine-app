"use server"
import { createServerClient } from "@/utils/supabase/server"

export async function createNotification(userId: string, title: string, body: string, type: string = "info", referenceId?: string) {
  const supabase = createServerClient()
  const { error } = await supabase.from("notifications").insert({
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
  const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null)
  return count || 0
}

export async function getNotifications(limit = 20) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(limit)
  if (error) throw new Error(error.message)
  return data
}

export async function markNotificationRead(notificationId: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notificationId).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  return { success: true }
}

export async function markAllNotificationsRead() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")
  const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", user.id).is("read_at", null)
  if (error) throw new Error(error.message)
  return { success: true }
}
