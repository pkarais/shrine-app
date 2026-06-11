"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"

export const startBreak = async (shiftId: string) => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const admin = createAdminClient()

  // Verify the shift belongs to this user
  const { data: shift } = await admin.from("shifts").select("id").eq("id", shiftId).eq("user_id", user.id).single()
  if (!shift) throw new Error("Shift not found")

  const { data, error } = await admin.from("breaks").insert({
    shift_id: shiftId,
    break_start: new Date().toISOString(),
  }).select("id").single()

  if (error) throw new Error(error.message)
  return { success: true, breakId: data.id as string }
}

export const endBreak = async (breakId: string) => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const admin = createAdminClient()

  // Get the break and verify ownership via its shift
  const { data: breakRow, error: breakError } = await admin
    .from("breaks")
    .select("shift_id")
    .eq("id", breakId)
    .single()

  if (breakError || !breakRow) throw new Error("Break not found")

  const { data: shift } = await admin.from("shifts").select("id").eq("id", breakRow.shift_id).eq("user_id", user.id).single()
  if (!shift) throw new Error("Unauthorized")

  const { error } = await admin
    .from("breaks")
    .update({ break_end: new Date().toISOString() })
    .eq("id", breakId)

  if (error) throw new Error(error.message)
  return { success: true }
}

export const getActiveBreak = async (shiftId: string) => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()

  const { data, error } = await admin
    .from("breaks")
    .select("*")
    .eq("shift_id", shiftId)
    .is("break_end", null)
    .order("break_start", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") return null
  return data
}
