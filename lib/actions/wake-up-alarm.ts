"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"

export async function getWakeUpAlarm() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from("staff_wake_up_alarms")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  return data
}

export async function setWakeUpAlarm(wakeUpTime: string, enabled: boolean) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("staff_wake_up_alarms")
    .upsert({
      user_id: user.id,
      wake_up_time: wakeUpTime,
      enabled,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id" })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteWakeUpAlarm() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const admin = createAdminClient()
  const { error } = await admin
    .from("staff_wake_up_alarms")
    .delete()
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)
}

export async function markAlarmTriggered() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const today = new Date().toISOString().split("T")[0]
  const admin = createAdminClient()
  const { error } = await admin
    .from("staff_wake_up_alarms")
    .update({ last_triggered_date: today, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)
}
