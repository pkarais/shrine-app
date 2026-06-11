"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { requireAuth, requireManager } from "./auth-helpers"
import { toEasternIso, easternToday } from "@/lib/eastern-time"

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
  const { error } = await admin.from("walkthroughs").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  if (error) throw new Error(error.message)
  return { success: true }
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
