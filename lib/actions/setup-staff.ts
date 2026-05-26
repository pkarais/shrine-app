"use server"

import { createAdminClient } from "@/utils/supabase/server"

export async function getStaffDirectory() {
  const admin = createAdminClient()
  const { data, error } = await admin.from("staff_directory").select("*").order("name")
  if (error) throw new Error(error.message)
  return data || []
}
