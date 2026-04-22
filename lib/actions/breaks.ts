"use server"

import { createServerClient } from "@/utils/supabase/server"

export const startBreak = async (shiftId: string) => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase.from("breaks").insert({
    shift_id: shiftId,
  }).select("id").single()

  if (error) throw new Error(error.message)
  return { success: true, breakId: data?.id as string }
}

export const endBreak = async (breakId: string) => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("breaks")
    .update({ break_end: new Date().toISOString() })
    .eq("id", breakId)
    .eq("shift_id", (
      await supabase.from("breaks").select("shift_id").eq("id", breakId).single()
    ).data?.shift_id)

  if (error) throw new Error(error.message)
  return { success: true, data }
}

export const getActiveBreak = async (shiftId: string) => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from("breaks")
    .select("*")
    .eq("shift_id", shiftId)
    .is("break_end", null)
    .order("break_start", { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== "PGRST116") throw new Error(error.message)
  return data
}
