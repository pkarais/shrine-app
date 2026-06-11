import { createClient } from "@supabase/supabase-js"
const admin = createClient("https://eqgikumohnvgdkwlzkus.supabase.co", "sb_secret_RYj_rA4by7LP42XGj8GbCA_IhJrr2rf")
const { data, error } = await admin.from("gamification_point_events").select("*").limit(1)
console.log("Events columns:", data?.length ? Object.keys(data[0]).join(", ") : "empty", "error:", error?.message)
