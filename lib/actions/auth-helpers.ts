"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

/**
 * Returns the authenticated user, or throws "Unauthorized".
 * Supports dev bypass cookie in development.
 */
export async function requireAuth() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) return user

  const hasDevBypass = cookies().get("shrine_dev_session")?.value === "true"
  if (hasDevBypass && process.env.NODE_ENV === "development") {
    const admin = createAdminClient()
    const { data: managerUser } = await admin.from("profiles").select("id, role").eq("role", "manager").limit(1).single()
    if (managerUser) {
      return { id: managerUser.id, role: managerUser.role } as any
    }
    const { data: anyUser } = await admin.from("profiles").select("id, role").limit(1).single()
    if (anyUser) {
      return { id: anyUser.id, role: anyUser.role } as any
    }
  }

  throw new Error("Unauthorized")
}

/**
 * Returns the authenticated user and verifies they are a manager.
 * Throws "Unauthorized" or "Only managers can perform this action".
 */
export async function requireManager() {
  const user = await requireAuth()
  const supabase = createServerClient()
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (!profile || !["manager", "admin"].includes(profile.role)) {
    throw new Error("Only managers can perform this action")
  }

  return user
}

/**
 * For read-only operations: returns a Supabase client.
 * In dev bypass mode, uses admin client (bypasses RLS).
 * Otherwise uses server client (RLS applies).
 */
export async function getDbClient() {
  const hasDevBypass = cookies().get("shrine_dev_session")?.value === "true"
  if (hasDevBypass && process.env.NODE_ENV === "development") {
    return createAdminClient()
  }
  return createServerClient()
}
