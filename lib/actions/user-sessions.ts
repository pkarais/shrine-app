"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"

/**
 * Register or update a user session to mark them as online/signed-in
 */
export async function updateUserSession() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    // Best-effort: silently fail if not authenticated (may be called during SSR)
    return { success: false }
  }

  const admin = createAdminClient()
  
  // Try to update existing session first
  const { data: existing } = await admin
    .from("user_sessions")
    .select("id")
    .eq("user_id", user.id)
    .single()
  
  let error
  if (existing) {
    // Update existing session with new heartbeat
    const result = await admin
      .from("user_sessions")
      .update({
        last_heartbeat: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
    error = result.error
  } else {
    // Create new session
    const result = await admin
      .from("user_sessions")
      .insert({
        user_id: user.id,
        last_heartbeat: new Date().toISOString(),
      })
    error = result.error
  }

  if (error) {
    console.error("Failed to update user session:", error)
    // Don't throw - this is a best-effort operation
  }

  return { success: !error }
}

/**
 * Get online status of all staff members
 */
export async function getStaffOnlineStatus() {
  const admin = createAdminClient()
  
  const { data, error } = await admin
    .from("v_staff_online_status")
    .select("*")
    .order("full_name", { ascending: true })
  
  if (error) {
    console.error("Failed to fetch staff online status:", error)
    return []
  }

  return data || []
}

/**
 * Get online status for a specific user
 */
export async function getUserOnlineStatus(userId: string) {
  const admin = createAdminClient()
  
  const { data, error } = await admin
    .from("v_staff_online_status")
    .select("*")
    .eq("id", userId)
    .single()
  
  if (error) {
    console.error("Failed to fetch user online status:", error)
    return null
  }

  return data
}

/**
 * Clear user session when they log out
 */
export async function clearUserSession() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: true }

  const admin = createAdminClient()
  const { error } = await admin
    .from("user_sessions")
    .delete()
    .eq("user_id", user.id)
  
  if (error) {
    console.error("Failed to clear user session:", error)
  }

  return { success: !error }
}
