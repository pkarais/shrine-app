import { createClient } from "@supabase/supabase-js"

const c = createClient(
  "https://eqgikumohnvgdkwlzkus.supabase.co",
  "sb_secret_RYj_rA4by7LP42XGj8GbCA_IhJrr2rf"
)

const { data, error } = await c.rpc("exec_sql", {
  query_text:
    "SELECT schemaname, tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'walkthroughs' ORDER BY policyname",
})

if (error) {
  console.log("RPC error:", JSON.stringify(error))
} else {
  console.log(JSON.stringify(data, null, 2))
}
