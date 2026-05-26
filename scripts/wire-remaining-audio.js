/**
 * Updates the remaining 11 reminder_templates rows with audio_url
 * (rows that exist with different reminder_type keys than my main script).
 */

const path = require("path")
const fs = require("fs")
const https = require("https")

try {
  const envPath = path.resolve(__dirname, "..", ".env.local")
  const envContent = fs.readFileSync(envPath, "utf-8")
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eqIdx = trimmed.indexOf("=")
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
} catch (_) {}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function request(method, pathname, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathname, SUPABASE_URL)
    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        "User-Agent": "shrine-cli/1.0",
      },
    }
    const req = https.request(options, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(new Error(`${res.statusCode}: ${data}`))
          return
        }
        try { resolve(data ? JSON.parse(data) : null) } catch { resolve(data) }
      })
    })
    req.on("error", reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

// Map existing reminder_type keys → audio file paths
const REMAINING = [
  { reminder_type: "clock_in_success", audio_url: "/audio/staff-reminders/successful-clock-in.mp3" },
  { reminder_type: "clock_out_success", audio_url: "/audio/staff-reminders/successful-clock-out.mp3" },
  { reminder_type: "opening_walkthrough", audio_url: "/audio/walkthrough-alerts/opening-walkthrough-reminder.mp3" },
  { reminder_type: "closing_walkthrough", audio_url: "/audio/walkthrough-alerts/closing-walkthrough-reminder.mp3" },
  { reminder_type: "task_assigned", audio_url: "/audio/task-alerts/task-assigned.mp3" },
  { reminder_type: "task_due_soon", audio_url: "/audio/task-alerts/task-due-soon.mp3" },
  { reminder_type: "task_overdue", audio_url: "/audio/task-alerts/task-overdue.mp3" },
  { reminder_type: "photo_required", audio_url: "/audio/task-alerts/photo-required.mp3" },
  { reminder_type: "note_required", audio_url: "/audio/task-alerts/note-required.mp3" },
  { reminder_type: "employee_of_month_nomination", audio_url: "/audio/leaderboard-alerts/eom-nomination.mp3" },
  { reminder_type: "employee_of_month_winner", audio_url: "/audio/leaderboard-alerts/eom-winner.mp3" },
]

;(async () => {
  console.log(`Updating ${REMAINING.length} remaining rows…`)
  for (const item of REMAINING) {
    const audioPath = item.audio_url.replace(/^\//, "")
    try {
      await request(
        "PATCH",
        `/rest/v1/reminder_templates?reminder_type=eq.${item.reminder_type}`,
        { audio_url: item.audio_url, audio_storage_path: audioPath }
      )
      console.log(`  ✓ ${item.reminder_type}`)
    } catch (err) {
      console.error(`  ✗ ${item.reminder_type}: ${err.message}`)
    }
  }
  console.log("Done.")
})()
