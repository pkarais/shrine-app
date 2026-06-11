import { createClient } from "@supabase/supabase-js"
const admin = createClient("https://eqgikumohnvgdkwlzkus.supabase.co", "sb_secret_RYj_rA4by7LP42XGj8GbCA_IhJrr2rf")

const checks = ["employee_id", "event_type", "action_key", "points", "source_id", "source_table", "note", "event_date", "created_at"]
for (const col of checks) {
  const { error } = await admin.from("gamification_point_events").select(col).limit(1)
  console.log(`${col}: ${error ? "NOT FOUND" : "EXISTS"}`)
}
