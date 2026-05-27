"use server"

import { createAdminClient } from "@/utils/supabase/server"
import { requireAuth } from "./auth-helpers"

export async function getStaffDirectory() {
  await requireAuth()
  const admin = createAdminClient()
  const { data, error } = await admin.from("staff_directory").select("*").order("name")
  if (error) throw new Error(error.message)
  return data || []
}
