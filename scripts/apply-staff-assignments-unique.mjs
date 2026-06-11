/**
 * Apply 20260601_staff_assignments_unique.sql via Supabase REST exec_sql RPC.
 * Falls back to printing the SQL if no RPC is configured so you can paste
 * it into the SQL editor.
 */
import https from "https"
import fs from "fs"

const env = fs.readFileSync(".env.local", "utf-8")
for (const l of env.split("\n")) {
  const t = l.trim()
  if (!t || t.startsWith("#")) continue
  const i = t.indexOf("=")
  if (i < 0) continue
  process.env[t.slice(0, i).trim()] = t.slice(i + 1).trim()
}
const BASE = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!BASE || !KEY) {
  console.error("Missing Supabase env")
  process.exit(1)
}

const sql = fs.readFileSync(
  "supabase/migrations/20260601_staff_assignments_unique.sql",
  "utf-8",
)

function rpc(path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path)
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let buf = ""
        res.on("data", (c) => (buf += c))
        res.on("end", () => {
          if (res.statusCode >= 400) return reject(new Error(`${res.statusCode} ${buf}`))
          resolve(buf)
        })
      },
    )
    req.on("error", reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function main() {
  try {
    const out = await rpc("/rest/v1/rpc/exec_sql", { sql })
    console.log("exec_sql ok:", out)
  } catch (err) {
    console.error("exec_sql RPC failed:", err.message)
    console.error("\n--- Run this SQL manually in the Supabase SQL editor: ---\n")
    console.error(sql)
    process.exit(1)
  }
}

main()
