"use server"

import { createServerClient } from "@/utils/supabase/server"

export async function signUpWithEmail(email: string, password: string, role: "operations" | "security" | "manager" = "operations") {
  const supabase = createServerClient()
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw new Error(error.message)
  if (data.user) {
    await supabase.from("profiles").update({ role }).eq("id", data.user.id)
  }
  return { success: true, user: data.user }
}

export async function resetPassword(email: string) {
  const supabase = createServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/api/auth/callback?next=/reset-password`,
  })
  if (error) throw new Error(error.message)
  return { success: true }
}
