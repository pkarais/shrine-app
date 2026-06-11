import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://eqgikumohnvgdkwlzkus.supabase.co"
const serviceRoleKey = "sb_secret_RYj_rA4by7LP42XGj8GbCA_IhJrr2rf"

const supabase = createClient(supabaseUrl, serviceRoleKey)

const { data, error } = await supabase
  .from("profiles")
  .select("id, email, role")
  .eq("email", "pk@pkaras.com")
  .single()

if (error) {
  console.error("Error:", error.message)
  process.exit(1)
}

console.log(JSON.stringify(data))
