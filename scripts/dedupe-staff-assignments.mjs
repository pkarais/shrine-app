/**
 * Dedupe staff_assignments rows.
 *
 * For every (event_id, user_id, role_assigned) triple with more than one
 * row, keep the OLDEST row and delete the rest. This clears the "2/1"
 * double-count caused by re-assigning the same staff member on the same
 * event (e.g. via the calendar event card).
 *
 * USAGE:
 *   node scripts/dedupe-staff-assignments.mjs           # preview only
 *   node scripts/dedupe-staff-assignments.mjs --apply   # execute deletions
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

const APPLY = process.argv.includes("--apply")

function rest(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + "/rest/v1" + path)
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname + url.search,
        method,
        headers: {
          apikey: KEY,
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
      },
      (res) => {
        let buf = ""
        res.on("data", (c) => (buf += c))
        res.on("end", () => {
          if (res.statusCode >= 400) return reject(new Error(`${res.statusCode} ${buf}`))
          try {
            resolve(buf ? JSON.parse(buf) : null)
          } catch {
            resolve(buf)
          }
        })
      },
    )
    req.on("error", reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "PREVIEW"} (use --apply to delete)`)

  // Page through all rows.
  const all = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const rows = await rest(
      "GET",
      `/staff_assignments?select=id,event_id,user_id,role_assigned,created_at&order=created_at.asc&offset=${from}&limit=${PAGE}`,
    )
    if (!rows || rows.length === 0) break
    all.push(...rows)
    if (rows.length < PAGE) break
    from += PAGE
  }
  console.log(`Loaded ${all.length} staff_assignments rows`)

  // Group by (event_id|user_id|role).
  const groups = new Map()
  for (const r of all) {
    if (!r.event_id || !r.user_id) continue
    const key = `${r.event_id}|${r.user_id}|${r.role_assigned || ""}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(r)
  }

  const toDelete = []
  for (const [key, rows] of groups.entries()) {
    if (rows.length <= 1) continue
    // Keep the first (oldest by created_at asc).
    const [, ...extras] = rows
    for (const ex of extras) toDelete.push({ key, id: ex.id, created_at: ex.created_at })
  }

  if (toDelete.length === 0) {
    console.log("No duplicates found.")
    return
  }

  console.log(`\nFound ${toDelete.length} duplicate rows across ${
    new Set(toDelete.map((d) => d.key)).size
  } groups:`)
  for (const d of toDelete.slice(0, 50)) {
    console.log(`  - ${d.key}  id=${d.id}  created_at=${d.created_at}`)
  }
  if (toDelete.length > 50) console.log(`  ... and ${toDelete.length - 50} more`)

  if (!APPLY) {
    console.log("\nPreview only. Re-run with --apply to delete.")
    return
  }

  // Delete in chunks via filter.
  const ids = toDelete.map((d) => d.id)
  const CHUNK = 50
  let deleted = 0
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK)
    const inList = chunk.map((id) => `"${id}"`).join(",")
    await rest("DELETE", `/staff_assignments?id=in.(${inList})`)
    deleted += chunk.length
    console.log(`  deleted ${deleted}/${ids.length}`)
  }
  console.log(`\nDone. Deleted ${deleted} duplicate rows.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
