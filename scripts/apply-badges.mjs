import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://eqgikumohnvgdkwlzkus.supabase.co"
const serviceKey = "sb_secret_RYj_rA4by7LP42XGj8GbCA_IhJrr2rf"
const supabase = createClient(supabaseUrl, serviceKey)

const updates = [
  { name: "Above & Beyond",         icon_url: "/badges/above_and_beyond.png" },
  { name: "On Time",                icon_url: "/badges/always_on_time.png" },
  { name: "Perfect Attendance",     icon_url: "/badges/perfect_attemdamce.png" },
  { name: "Problem Solver",         icon_url: "/badges/problem_solver.png" },
  { name: "Team Player",            icon_url: "/badges/team_player.png" },
  { name: "Walkthrough Champion",   icon_url: "/badges/checklist_champion.png" },
]

const inserts = [
  { name: "Event Ready",     description: "Prepared and set up spaces for events flawlessly",         category: "performance", point_value: 25, max_level: 3, icon_url: "/badges/event_ready.png" },
  { name: "Growth Mindset",  description: "Shows continuous improvement and learning",                 category: "leadership",  point_value: 30, max_level: 3, icon_url: "/badges/growth_mindset.png" },
  { name: "Pristine Space",  description: "Maintained exceptionally clean and organized areas",       category: "general",     point_value: 20, max_level: 3, icon_url: "/badges/pristine_space.png" },
  { name: "Safety Watch",    description: "Vigilant about safety protocols and hazard prevention",    category: "safety",      point_value: 25, max_level: 3, icon_url: "/badges/safety_watch.png" },
  { name: "Secure Building", description: "Exemplary performance in building security and access control", category: "safety", point_value: 25, max_level: 3, icon_url: "/badges/secure_building.png" },
  { name: "Self Starter",    description: "Takes initiative without needing direction",               category: "leadership",  point_value: 20, max_level: 3, icon_url: "/badges/self_starter.png" },
]

const pointRules = [
  { action_key: "event_ready_completed", description: "Prepared an event space",         points: 5,  max_per_day: 2 },
  { action_key: "growth_milestone",      description: "Completed a learning milestone",  points: 10, max_per_day: 1 },
  { action_key: "pristine_check",        description: "Maintained a pristine area",      points: 3,  max_per_day: 3 },
  { action_key: "safety_observation",    description: "Reported a safety observation",   points: 5,  max_per_day: 3 },
  { action_key: "security_round",        description: "Completed a security round",      points: 5,  max_per_day: 2 },
  { action_key: "self_initiated_task",   description: "Took initiative on unassigned task", points: 8, max_per_day: 2 },
]

for (const { name, icon_url } of updates) {
  const { error } = await supabase.from("recognition_badges").update({ icon_url }).eq("name", name)
  if (error) console.error(`Update ${name}:`, error.message)
  else console.log(`Updated: ${name} -> ${icon_url}`)
}

for (const badge of inserts) {
  const { error } = await supabase.from("recognition_badges").upsert(badge, { onConflict: "name" })
  if (error) console.error(`Insert ${badge.name}:`, error.message)
  else console.log(`Inserted: ${badge.name} -> ${badge.icon_url}`)
}

for (const rule of pointRules) {
  const { error } = await supabase.from("gamification_point_rules").upsert(rule, { onConflict: "action_key" })
  if (error) console.error(`Rule ${rule.action_key}:`, error.message)
  else console.log(`Rule: ${rule.action_key} -> ${rule.points} pts`)
}

console.log("Done")
