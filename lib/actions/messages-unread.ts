"use server"
import { createServerClient } from "@/utils/supabase/server"

export async function getUnreadCount() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null)
  if (error) return 0
  return count ?? 0
}
