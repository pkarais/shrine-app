/**
 * Wires audio_url and audio_storage_path on reminder_templates.
 * Updates existing rows; inserts new ones for sounds without templates.
 *
 * Usage: node scripts/wire-audio-reminders.js
 */

const path = require("path")
const fs = require("fs")
const https = require("https")

// ── Load .env.local ──────────────────────────────────────────────────────
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

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

// ── REST helper ──────────────────────────────────────────────────────────
function request(method, pathname, body, extraHeaders = {}) {
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
        ...extraHeaders,
      },
    }
    const req = https.request(options, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        if (res.statusCode >= 400) {
          reject(new Error(`${method} ${pathname} → ${res.statusCode}: ${data}`))
          return
        }
        try {
          resolve(data ? JSON.parse(data) : null)
        } catch {
          resolve(data)
        }
      })
    })
    req.on("error", reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

// ── Audio templates to wire ──────────────────────────────────────────────
// reminder_type → { title, short_text, full_text, audio_url, tone }
const TEMPLATES = [
  // Staff Reminders
  { reminder_type: "wake_up", title: "Wake-Up Reminder", short_text: "Wake up, legend. Your shift is calling.", full_text: "You are scheduled to work today. Please wake up and arrive on time.", audio_url: "/audio/staff-reminders/wake-up-reminder.mp3", tone: "funny_reminder" },
  { reminder_type: "leave_now", title: "Leave Now Reminder", short_text: "Time to roll. Move now to be on time.", full_text: "Your shift starts soon. Please leave now to arrive on time.", audio_url: "/audio/staff-reminders/leave-now-reminder.mp3", tone: "funny_warning" },
  { reminder_type: "shift_start", title: "Shift Start Reminder", short_text: "Shift starts soon — get ready.", full_text: "Your scheduled shift is starting soon. Please prepare to clock in.", audio_url: "/audio/staff-reminders/shift-start-reminder.mp3", tone: "funny_reminder" },
  { reminder_type: "late_warning", title: "Late Warning", short_text: "You are officially late.", full_text: "You are showing as late for your scheduled shift.", audio_url: "/audio/staff-reminders/late-warning.mp3", tone: "funny_warning" },
  { reminder_type: "geo_fence_warning", title: "Geo-Fence Warning", short_text: "You are outside the approved area.", full_text: "Clock-in denied. Your location is outside the approved geo-fence.", audio_url: "/audio/staff-reminders/geofence-warning.mp3", tone: "funny_warning" },
  { reminder_type: "shift_started", title: "Shift Started", short_text: "Your shift has officially started.", full_text: "Your scheduled shift has begun.", audio_url: "/audio/staff-reminders/shift-started.mp3", tone: "positive" },
  { reminder_type: "missed_clock_out", title: "Missed Clock-Out Reminder", short_text: "Did you forget to clock out?", full_text: "You have not clocked out from your last shift.", audio_url: "/audio/staff-reminders/missed-clock-out-reminder.mp3", tone: "warning" },
  { reminder_type: "near_geo_fence", title: "Near Geo-Fence Warning", short_text: "Approaching geo-fence boundary.", full_text: "Your device indicates you are near the geo-fence boundary.", audio_url: "/audio/staff-reminders/near-geofence-warning.mp3", tone: "warning" },
  { reminder_type: "suspicious_location", title: "Suspicious Location Warning", short_text: "Clock-in from an unusual location.", full_text: "A clock-in was attempted from an unusual location.", audio_url: "/audio/staff-reminders/suspicious-location-warning.mp3", tone: "critical" },
  { reminder_type: "successful_clock_in", title: "Successful Clock-In", short_text: "You are clocked in.", full_text: "Your clock-in was successful.", audio_url: "/audio/staff-reminders/successful-clock-in.mp3", tone: "positive" },
  { reminder_type: "successful_clock_out", title: "Successful Clock-Out", short_text: "Clocked out successfully.", full_text: "Your clock-out was successful.", audio_url: "/audio/staff-reminders/successful-clock-out.mp3", tone: "positive" },
  // App Alerts
  { reminder_type: "all_tasks_complete", title: "All Tasks Complete", short_text: "Every task done — clean sweep.", full_text: "All assigned tasks for the day have been completed.", audio_url: "/audio/app-alerts/all-tasks-complete.mp3", tone: "positive" },
  { reminder_type: "app_sync_failed", title: "App Sync Failed", short_text: "Could not sync with the server.", full_text: "The app was unable to sync with the server. Check your connection.", audio_url: "/audio/app-alerts/app-sync-failed.mp3", tone: "critical" },
  { reminder_type: "break_over", title: "Break Over Reminder", short_text: "Break time is over.", full_text: "Your scheduled break has ended.", audio_url: "/audio/app-alerts/break-over-reminder.mp3", tone: "reminder" },
  { reminder_type: "break_reminder", title: "Break Reminder", short_text: "Time for a break.", full_text: "You are due for a scheduled break.", audio_url: "/audio/app-alerts/break-reminder.mp3", tone: "reminder" },
  { reminder_type: "end_of_shift", title: "End of Shift Reminder", short_text: "Your shift is ending soon.", full_text: "Your shift is approaching its end.", audio_url: "/audio/app-alerts/end-of-shift-reminder.mp3", tone: "reminder" },
  { reminder_type: "idle_reminder", title: "Idle Reminder", short_text: "No activity detected.", full_text: "No activity has been detected for a period.", audio_url: "/audio/app-alerts/idle-reminder.mp3", tone: "warning" },
  { reminder_type: "location_permission", title: "Location Permission Reminder", short_text: "Location access required to clock in.", full_text: "Clock-in requires location permission.", audio_url: "/audio/app-alerts/location-permission-reminder.mp3", tone: "reminder" },
  { reminder_type: "low_battery", title: "Low Battery Reminder", short_text: "Device battery is low.", full_text: "Your device battery is low. Please charge soon.", audio_url: "/audio/app-alerts/low-battery-reminder.mp3", tone: "warning" },
  // Manager Alerts
  { reminder_type: "geo_fence_alert", title: "Geo-Fence Alert", short_text: "Staff clocked in outside geo-fence.", full_text: "A staff clock-in was detected outside the approved geo-fence.", audio_url: "/audio/manager-alerts/geofence-alert.mp3", tone: "critical" },
  { reminder_type: "manager_late_alert", title: "Late Alert", short_text: "A staff member is late.", full_text: "A staff member has clocked in late.", audio_url: "/audio/manager-alerts/late-alert.mp3", tone: "warning" },
  { reminder_type: "manager_missed_walkthrough", title: "Missed Walkthrough", short_text: "A walkthrough was missed.", full_text: "A required walkthrough was not completed.", audio_url: "/audio/manager-alerts/missed-walkthrough.mp3", tone: "warning" },
  { reminder_type: "manager_safety_alert", title: "Safety Alert", short_text: "Safety incident reported.", full_text: "A safety incident has been reported.", audio_url: "/audio/manager-alerts/safety-alert.mp3", tone: "critical" },
  { reminder_type: "manager_task_overdue", title: "Task Overdue (Manager)", short_text: "A task is past its due time.", full_text: "A task is overdue and requires attention.", audio_url: "/audio/manager-alerts/task-overdue.mp3", tone: "warning" },
  // Leaderboard / EOTM
  { reminder_type: "eom_nomination", title: "Employee of the Month Nomination", short_text: "You were nominated for EOM!", full_text: "Congratulations! You have been nominated for Employee of the Month.", audio_url: "/audio/leaderboard-alerts/eom-nomination.mp3", tone: "positive" },
  { reminder_type: "eom_winner", title: "Employee of the Month Winner", short_text: "You won Employee of the Month!", full_text: "You have been awarded Employee of the Month!", audio_url: "/audio/leaderboard-alerts/eom-winner.mp3", tone: "celebration" },
  { reminder_type: "leaderboard_jump", title: "Leaderboard Jump", short_text: "You moved up the leaderboard!", full_text: "Your leaderboard ranking has improved.", audio_url: "/audio/leaderboard-alerts/leaderboard-jump.mp3", tone: "positive" },
  { reminder_type: "points_deducted", title: "Points Deducted", short_text: "Points were deducted.", full_text: "Points were deducted due to a policy event.", audio_url: "/audio/leaderboard-alerts/points-deducted.mp3", tone: "warning" },
  { reminder_type: "top_five", title: "Top Five Alert", short_text: "You are in the top five!", full_text: "You have entered the top five on the leaderboard.", audio_url: "/audio/leaderboard-alerts/top-five-alert.mp3", tone: "positive" },
  // Badges
  { reminder_type: "badge_earned", title: "Badge Earned", short_text: "You earned a badge!", full_text: "A recognition badge was awarded to you.", audio_url: "/audio/badge-alerts/badge-earned.mp3", tone: "positive" },
  { reminder_type: "badge_above_beyond", title: "Above & Beyond Badge", short_text: "Above & Beyond badge earned!", full_text: "The Above & Beyond badge recognizes major contributions beyond normal duties.", audio_url: "/audio/badge-alerts/above-beyond-badge.mp3", tone: "celebration" },
  { reminder_type: "badge_always_on_time", title: "Always On Time Badge", short_text: "Always On Time badge earned!", full_text: "The Always On Time badge recognizes perfect punctuality.", audio_url: "/audio/badge-alerts/always-on-time-badge.mp3", tone: "positive" },
  { reminder_type: "badge_checklist_champion", title: "Checklist Champion Badge", short_text: "Checklist Champion badge earned!", full_text: "The Checklist Champion badge recognizes accurate checklist completion.", audio_url: "/audio/badge-alerts/checklist-champion-badge.mp3", tone: "positive" },
  { reminder_type: "badge_event_ready", title: "Event Ready Badge", short_text: "Event Ready badge earned!", full_text: "The Event Ready badge recognizes supporting events successfully.", audio_url: "/audio/badge-alerts/event-ready-badge.mp3", tone: "positive" },
  { reminder_type: "badge_growth_mindset", title: "Growth Mindset Badge", short_text: "Growth Mindset badge earned!", full_text: "The Growth Mindset badge recognizes improvement and coachability.", audio_url: "/audio/badge-alerts/growth-mindset-badge.mp3", tone: "positive" },
  { reminder_type: "badge_perfect_attendance", title: "Perfect Attendance Badge", short_text: "Perfect Attendance badge earned!", full_text: "The Perfect Attendance badge recognizes a month with no absences.", audio_url: "/audio/badge-alerts/perfect-attendance-badge.mp3", tone: "celebration" },
  { reminder_type: "badge_pristine_space", title: "Pristine Space Badge", short_text: "Pristine Space badge earned!", full_text: "The Pristine Space badge recognizes consistently clean assigned areas.", audio_url: "/audio/badge-alerts/pristine-space-badge.mp3", tone: "positive" },
  { reminder_type: "badge_reset_champion", title: "Reset Champion Badge", short_text: "Reset Champion badge earned!", full_text: "The Reset Champion badge recognizes restoring spaces after events.", audio_url: "/audio/badge-alerts/reset-champion-badge.mp3", tone: "positive" },
  { reminder_type: "badge_safety_watch", title: "Safety Watch Badge", short_text: "Safety Watch badge earned!", full_text: "The Safety Watch badge recognizes identifying safety concerns.", audio_url: "/audio/badge-alerts/safety-watch-badge.mp3", tone: "positive" },
  { reminder_type: "badge_secure_building", title: "Secure Building Badge", short_text: "Secure Building badge earned!", full_text: "The Secure Building badge recognizes correct security procedures.", audio_url: "/audio/badge-alerts/secure-building-badge.mp3", tone: "positive" },
  { reminder_type: "badge_self_starter", title: "Self-Starter Badge", short_text: "Self-Starter badge earned!", full_text: "The Self-Starter badge recognizes taking initiative.", audio_url: "/audio/badge-alerts/self-starter-badge.mp3", tone: "positive" },
  { reminder_type: "badge_team_player", title: "Team Player Badge", short_text: "Team Player badge earned!", full_text: "The Team Player badge recognizes helping coworkers.", audio_url: "/audio/badge-alerts/team-player-badge.mp3", tone: "positive" },
  // Safety
  { reminder_type: "blocked_exit", title: "Blocked Exit Warning", short_text: "Blocked exit detected.", full_text: "A blocked or obstructed exit was detected.", audio_url: "/audio/safety-alerts/blocked-exit-warning.mp3", tone: "critical" },
  { reminder_type: "hazard_reminder", title: "Hazard Reminder", short_text: "Check for hazards.", full_text: "Reminder to check for or address a safety hazard.", audio_url: "/audio/safety-alerts/hazard-reminder.mp3", tone: "warning" },
  { reminder_type: "safety_issue_reported", title: "Safety Issue Reported", short_text: "Safety issue reported.", full_text: "A safety issue has been reported by staff.", audio_url: "/audio/safety-alerts/safety-issue-reported.mp3", tone: "critical" },
  { reminder_type: "security_issue_reported", title: "Security Issue Reported", short_text: "Security issue reported.", full_text: "A security issue has been reported.", audio_url: "/audio/safety-alerts/security-issue-reported.mp3", tone: "critical" },
  // Tasks
  { reminder_type: "task_note_required", title: "Note Required", short_text: "Add a note to complete this task.", full_text: "A note or comment is required to complete this task.", audio_url: "/audio/task-alerts/note-required.mp3", tone: "reminder" },
  { reminder_type: "task_photo_required", title: "Photo Required", short_text: "A photo is required.", full_text: "A photo is required to complete this task.", audio_url: "/audio/task-alerts/photo-required.mp3", tone: "reminder" },
  { reminder_type: "task_assigned", title: "Task Assigned", short_text: "New task assigned.", full_text: "A new task has been assigned.", audio_url: "/audio/task-alerts/task-assigned.mp3", tone: "info" },
  { reminder_type: "task_completed", title: "Task Completed", short_text: "Task completed.", full_text: "A task has been marked complete.", audio_url: "/audio/task-alerts/task-completed.mp3", tone: "positive" },
  { reminder_type: "task_due_soon", title: "Task Due Soon", short_text: "Task due soon.", full_text: "A task is approaching its due time.", audio_url: "/audio/task-alerts/task-due-soon.mp3", tone: "reminder" },
  { reminder_type: "task_overdue", title: "Task Overdue", short_text: "Task is overdue.", full_text: "A task has passed its due time.", audio_url: "/audio/task-alerts/task-overdue.mp3", tone: "warning" },
  { reminder_type: "urgent_task", title: "Urgent Task", short_text: "Urgent task assigned.", full_text: "An urgent task requires immediate attention.", audio_url: "/audio/task-alerts/urgent-task.mp3", tone: "critical" },
  // Walkthrough
  { reminder_type: "checklist_incomplete", title: "Checklist Incomplete", short_text: "Checklist was incomplete.", full_text: "A checklist was submitted incomplete.", audio_url: "/audio/walkthrough-alerts/checklist-incomplete.mp3", tone: "warning" },
  { reminder_type: "closing_walkthrough", title: "Closing Walkthrough Reminder", short_text: "Closing walkthrough due.", full_text: "Reminder to complete the closing walkthrough.", audio_url: "/audio/walkthrough-alerts/closing-walkthrough-reminder.mp3", tone: "reminder" },
  { reminder_type: "door_check_missing", title: "Door Check Missing", short_text: "Door check not completed.", full_text: "A required door check has not been completed.", audio_url: "/audio/walkthrough-alerts/door-check-missing.mp3", tone: "warning" },
  { reminder_type: "opening_walkthrough", title: "Opening Walkthrough Reminder", short_text: "Opening walkthrough due.", full_text: "Reminder to complete the opening walkthrough.", audio_url: "/audio/walkthrough-alerts/opening-walkthrough-reminder.mp3", tone: "reminder" },
  { reminder_type: "security_check", title: "Security Check Reminder", short_text: "Security check due.", full_text: "Reminder to perform a security check.", audio_url: "/audio/walkthrough-alerts/security-check-reminder.mp3", tone: "reminder" },
]

;(async () => {
  console.log(`Wiring ${TEMPLATES.length} audio templates → reminder_templates`)

  // Get existing rows so we can decide UPDATE vs INSERT per row
  const existing = await request(
    "GET",
    "/rest/v1/reminder_templates?select=id,reminder_type"
  )
  const existingByType = new Map(
    (existing || []).map((r) => [r.reminder_type, r.id])
  )

  let updated = 0
  let inserted = 0

  for (const tpl of TEMPLATES) {
    const audioPath = tpl.audio_url.replace(/^\//, "") // storage path without leading slash
    const id = existingByType.get(tpl.reminder_type)
    const payload = {
      title: tpl.title,
      reminder_type: tpl.reminder_type,
      short_text: tpl.short_text,
      full_text: tpl.full_text,
      audio_url: tpl.audio_url,
      audio_storage_path: audioPath,
      tone: tpl.tone,
      is_global: true,
      is_active: true,
    }

    try {
      if (id) {
        await request(
          "PATCH",
          `/rest/v1/reminder_templates?id=eq.${id}`,
          { audio_url: tpl.audio_url, audio_storage_path: audioPath }
        )
        updated++
        console.log(`  ✓ updated ${tpl.reminder_type}`)
      } else {
        await request("POST", "/rest/v1/reminder_templates", payload)
        inserted++
        console.log(`  + inserted ${tpl.reminder_type}`)
      }
    } catch (err) {
      console.error(`  ✗ ${tpl.reminder_type}: ${err.message}`)
    }
  }

  console.log(`\nDone. Updated: ${updated}. Inserted: ${inserted}.`)
})()
