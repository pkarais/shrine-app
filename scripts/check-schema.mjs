import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://eqgikumohnvgdkwlzkus.supabase.co"
const serviceKey = "sb_secret_RYj_rA4by7LP42XGj8GbCA_IhJrr2rf"
const supabase = createClient(supabaseUrl, serviceKey)

// Check existing badges
const { data: existingBadges } = await supabase.from("recognition_badges").select("*")
console.log("recognition_badges columns:", existingBadges?.length ? Object.keys(existingBadges[0]).join(", ") : "no rows")
existingBadges?.forEach(b => console.log(`  ${b.name}: icon_url=${b.icon_url}, max_level=${b.max_level}`))

// Check point rules
const { data: existingRules } = await supabase.from("gamification_point_rules").select("*")
console.log("gamification_point_rules columns:", existingRules?.length ? Object.keys(existingRules[0]).join(", ") : "no rows")
existingRules?.forEach(r => console.log(`  ${r.action_key || r.name}: points=${r.points}`))

// Check all tables
const { data: tables } = await supabase.rpc("get_schema_info" as any)
console.log("Tables:", tables)
