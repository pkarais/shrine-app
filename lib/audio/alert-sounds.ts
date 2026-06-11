export type AlertSoundKey =
  | "all_tasks_complete"
  | "app_sync_failed"
  | "break_over_reminder"
  | "break_reminder"
  | "end_of_shift_reminder"
  | "idle_reminder"
  | "location_permission_reminder"
  | "low_battery_reminder"
  | "message_received"
  | "manager_geofence_alert"
  | "manager_late_alert"
  | "manager_missed_walkthrough"
  | "manager_safety_alert"
  | "manager_task_overdue"
  | "eom_nomination"
  | "eom_winner"
  | "leaderboard_jump"
  | "points_deducted"
  | "top_five_alert"
  | "badge_earned"
  | "badge_above_beyond"
  | "badge_always_on_time"
  | "badge_checklist_champion"
  | "badge_event_ready"
  | "badge_growth_mindset"
  | "badge_perfect_attendance"
  | "badge_pristine_space"
  | "badge_reset_champion"
  | "badge_safety_watch"
  | "badge_secure_building"
  | "badge_self_starter"
  | "badge_team_player"
  | "blocked_exit_warning"
  | "hazard_reminder"
  | "safety_issue_reported"
  | "security_issue_reported"
  | "task_note_required"
  | "task_photo_required"
  | "task_assigned"
  | "task_completed"
  | "task_due_soon"
  | "task_overdue"
  | "urgent_task"
  | "checklist_incomplete"
  | "closing_walkthrough_reminder"
  | "door_check_missing"
  | "opening_walkthrough_reminder"
  | "security_check_reminder"
  | "geofence_warning"
  | "late_warning"
  | "leave_now_reminder"
  | "missed_clock_out_reminder"
  | "near_geofence_warning"
  | "shift_start_reminder"
  | "shift_started"
  | "successful_clock_in"
  | "successful_clock_out"
  | "suspicious_location_warning"
  | "wake_up_reminder"

export type AlertSoundCategory = "app-alerts" | "manager-alerts" | "leaderboard-alerts" | "badge-alerts" | "safety-alerts" | "task-alerts" | "walkthrough-alerts" | "staff-reminders"

export interface AlertSoundConfig {
  key: AlertSoundKey
  label: string
  file: string
  category: AlertSoundCategory
  description: string
}

const BASE = "/audio"

export const ALERT_SOUNDS: Record<AlertSoundKey, AlertSoundConfig> = {
  all_tasks_complete: {
    key: "all_tasks_complete",
    label: "All Tasks Complete",
    file: `${BASE}/app-alerts/all-tasks-complete.mp3`,
    category: "app-alerts",
    description: "All tasks and checklists for the day are complete",
  },
  app_sync_failed: {
    key: "app_sync_failed",
    label: "App Sync Failed",
    file: `${BASE}/app-alerts/app-sync-failed.mp3`,
    category: "app-alerts",
    description: "Application sync with server failed",
  },
  break_over_reminder: {
    key: "break_over_reminder",
    label: "Break Over Reminder",
    file: `${BASE}/app-alerts/break-over-reminder.mp3`,
    category: "app-alerts",
    description: "Break time has ended, return to work",
  },
  break_reminder: {
    key: "break_reminder",
    label: "Break Reminder",
    file: `${BASE}/app-alerts/break-reminder.mp3`,
    category: "app-alerts",
    description: "Time to take a scheduled break",
  },
  end_of_shift_reminder: {
    key: "end_of_shift_reminder",
    label: "End of Shift Reminder",
    file: `${BASE}/app-alerts/end-of-shift-reminder.mp3`,
    category: "app-alerts",
    description: "Shift is ending soon",
  },
  idle_reminder: {
    key: "idle_reminder",
    label: "Idle Reminder",
    file: `${BASE}/app-alerts/idle-reminder.mp3`,
    category: "app-alerts",
    description: "No activity detected for a period",
  },
  location_permission_reminder: {
    key: "location_permission_reminder",
    label: "Location Permission Reminder",
    file: `${BASE}/app-alerts/location-permission-reminder.mp3`,
    category: "app-alerts",
    description: "Location permission required for clock-in",
  },
  low_battery_reminder: {
    key: "low_battery_reminder",
    label: "Low Battery Reminder",
    file: `${BASE}/app-alerts/low-battery-reminder.mp3`,
    category: "app-alerts",
    description: "Device battery is running low",
  },
  message_received: {
    key: "message_received",
    label: "New Message Received",
    // Reuses task-assigned.mp3 as a gentle ping until a dedicated message tone is uploaded.
    file: `${BASE}/task-alerts/task-assigned.mp3`,
    category: "app-alerts",
    description: "A new direct or group message has arrived",
  },
  manager_geofence_alert: {
    key: "manager_geofence_alert",
    label: "Geo-Fence Alert",
    file: `${BASE}/manager-alerts/geofence-alert.mp3`,
    category: "manager-alerts",
    description: "Staff clock-in/out outside approved geofence",
  },
  manager_late_alert: {
    key: "manager_late_alert",
    label: "Late Alert",
    file: `${BASE}/manager-alerts/late-alert.mp3`,
    category: "manager-alerts",
    description: "Staff member clocked in late",
  },
  manager_missed_walkthrough: {
    key: "manager_missed_walkthrough",
    label: "Missed Walkthrough",
    file: `${BASE}/manager-alerts/missed-walkthrough.mp3`,
    category: "manager-alerts",
    description: "Staff missed a required opening or closing walkthrough",
  },
  manager_safety_alert: {
    key: "manager_safety_alert",
    label: "Safety Alert",
    file: `${BASE}/manager-alerts/safety-alert.mp3`,
    category: "manager-alerts",
    description: "Safety issue or incident reported",
  },
  manager_task_overdue: {
    key: "manager_task_overdue",
    label: "Task Overdue",
    file: `${BASE}/manager-alerts/task-overdue.mp3`,
    category: "manager-alerts",
    description: "A task or ticket is past due",
  },
  eom_nomination: {
    key: "eom_nomination",
    label: "Employee of the Month Nomination",
    file: `${BASE}/leaderboard-alerts/eom-nomination.mp3`,
    category: "leaderboard-alerts",
    description: "Nominated for Employee of the Month",
  },
  eom_winner: {
    key: "eom_winner",
    label: "Employee of the Month Winner",
    file: `${BASE}/leaderboard-alerts/eom-winner.mp3`,
    category: "leaderboard-alerts",
    description: "Awarded Employee of the Month",
  },
  leaderboard_jump: {
    key: "leaderboard_jump",
    label: "Leaderboard Jump",
    file: `${BASE}/leaderboard-alerts/leaderboard-jump.mp3`,
    category: "leaderboard-alerts",
    description: "Moved up in the leaderboard rankings",
  },
  points_deducted: {
    key: "points_deducted",
    label: "Points Deducted",
    file: `${BASE}/leaderboard-alerts/points-deducted.mp3`,
    category: "leaderboard-alerts",
    description: "Points were deducted due to a policy event",
  },
  top_five_alert: {
    key: "top_five_alert",
    label: "Top Five Alert",
    file: `${BASE}/leaderboard-alerts/top-five-alert.mp3`,
    category: "leaderboard-alerts",
    description: "Entered or is in the top five of the leaderboard",
  },
  badge_earned: {
    key: "badge_earned",
    label: "Badge Earned",
    file: `${BASE}/badge-alerts/badge-earned.mp3`,
    category: "badge-alerts",
    description: "A recognition badge was earned",
  },
  badge_above_beyond: {
    key: "badge_above_beyond",
    label: "Above & Beyond Badge",
    file: `${BASE}/badge-alerts/above-beyond-badge.mp3`,
    category: "badge-alerts",
    description: "Above & Beyond badge earned",
  },
  badge_always_on_time: {
    key: "badge_always_on_time",
    label: "Always On Time Badge",
    file: `${BASE}/badge-alerts/always-on-time-badge.mp3`,
    category: "badge-alerts",
    description: "Always On Time badge earned",
  },
  badge_checklist_champion: {
    key: "badge_checklist_champion",
    label: "Checklist Champion Badge",
    file: `${BASE}/badge-alerts/checklist-champion-badge.mp3`,
    category: "badge-alerts",
    description: "Checklist Champion badge earned",
  },
  badge_event_ready: {
    key: "badge_event_ready",
    label: "Event Ready Badge",
    file: `${BASE}/badge-alerts/event-ready-badge.mp3`,
    category: "badge-alerts",
    description: "Event Ready badge earned",
  },
  badge_growth_mindset: {
    key: "badge_growth_mindset",
    label: "Growth Mindset Badge",
    file: `${BASE}/badge-alerts/growth-mindset-badge.mp3`,
    category: "badge-alerts",
    description: "Growth Mindset badge earned",
  },
  badge_perfect_attendance: {
    key: "badge_perfect_attendance",
    label: "Perfect Attendance Badge",
    file: `${BASE}/badge-alerts/perfect-attendance-badge.mp3`,
    category: "badge-alerts",
    description: "Perfect Attendance badge earned",
  },
  badge_pristine_space: {
    key: "badge_pristine_space",
    label: "Pristine Space Badge",
    file: `${BASE}/badge-alerts/pristine-space-badge.mp3`,
    category: "badge-alerts",
    description: "Pristine Space badge earned",
  },
  badge_reset_champion: {
    key: "badge_reset_champion",
    label: "Reset Champion Badge",
    file: `${BASE}/badge-alerts/reset-champion-badge.mp3`,
    category: "badge-alerts",
    description: "Reset Champion badge earned",
  },
  badge_safety_watch: {
    key: "badge_safety_watch",
    label: "Safety Watch Badge",
    file: `${BASE}/badge-alerts/safety-watch-badge.mp3`,
    category: "badge-alerts",
    description: "Safety Watch badge earned",
  },
  badge_secure_building: {
    key: "badge_secure_building",
    label: "Secure Building Badge",
    file: `${BASE}/badge-alerts/secure-building-badge.mp3`,
    category: "badge-alerts",
    description: "Secure Building badge earned",
  },
  badge_self_starter: {
    key: "badge_self_starter",
    label: "Self-Starter Badge",
    file: `${BASE}/badge-alerts/self-starter-badge.mp3`,
    category: "badge-alerts",
    description: "Self-Starter badge earned",
  },
  badge_team_player: {
    key: "badge_team_player",
    label: "Team Player Badge",
    file: `${BASE}/badge-alerts/team-player-badge.mp3`,
    category: "badge-alerts",
    description: "Team Player badge earned",
  },
  blocked_exit_warning: {
    key: "blocked_exit_warning",
    label: "Blocked Exit Warning",
    file: `${BASE}/safety-alerts/blocked-exit-warning.mp3`,
    category: "safety-alerts",
    description: "A blocked or obstructed exit has been detected",
  },
  hazard_reminder: {
    key: "hazard_reminder",
    label: "Hazard Reminder",
    file: `${BASE}/safety-alerts/hazard-reminder.mp3`,
    category: "safety-alerts",
    description: "Reminder to check for or address a safety hazard",
  },
  safety_issue_reported: {
    key: "safety_issue_reported",
    label: "Safety Issue Reported",
    file: `${BASE}/safety-alerts/safety-issue-reported.mp3`,
    category: "safety-alerts",
    description: "A safety issue has been reported by staff",
  },
  security_issue_reported: {
    key: "security_issue_reported",
    label: "Security Issue Reported",
    file: `${BASE}/safety-alerts/security-issue-reported.mp3`,
    category: "safety-alerts",
    description: "A security issue has been reported by staff",
  },
  task_note_required: {
    key: "task_note_required",
    label: "Note Required",
    file: `${BASE}/task-alerts/note-required.mp3`,
    category: "task-alerts",
    description: "A note or comment is required on a task",
  },
  task_photo_required: {
    key: "task_photo_required",
    label: "Photo Required",
    file: `${BASE}/task-alerts/photo-required.mp3`,
    category: "task-alerts",
    description: "A photo is required to complete a task",
  },
  task_assigned: {
    key: "task_assigned",
    label: "Task Assigned",
    file: `${BASE}/task-alerts/task-assigned.mp3`,
    category: "task-alerts",
    description: "A new task has been assigned",
  },
  task_completed: {
    key: "task_completed",
    label: "Task Completed",
    file: `${BASE}/task-alerts/task-completed.mp3`,
    category: "task-alerts",
    description: "A task has been marked complete",
  },
  task_due_soon: {
    key: "task_due_soon",
    label: "Task Due Soon",
    file: `${BASE}/task-alerts/task-due-soon.mp3`,
    category: "task-alerts",
    description: "A task is approaching its due time",
  },
  task_overdue: {
    key: "task_overdue",
    label: "Task Overdue",
    file: `${BASE}/task-alerts/task-overdue.mp3`,
    category: "task-alerts",
    description: "A task has passed its due time",
  },
  urgent_task: {
    key: "urgent_task",
    label: "Urgent Task",
    file: `${BASE}/task-alerts/urgent-task.mp3`,
    category: "task-alerts",
    description: "An urgent task requires immediate attention",
  },
  checklist_incomplete: {
    key: "checklist_incomplete",
    label: "Checklist Incomplete",
    file: `${BASE}/walkthrough-alerts/checklist-incomplete.mp3`,
    category: "walkthrough-alerts",
    description: "A checklist was submitted incomplete",
  },
  closing_walkthrough_reminder: {
    key: "closing_walkthrough_reminder",
    label: "Closing Walkthrough Reminder",
    file: `${BASE}/walkthrough-alerts/closing-walkthrough-reminder.mp3`,
    category: "walkthrough-alerts",
    description: "Reminder to complete the closing walkthrough",
  },
  door_check_missing: {
    key: "door_check_missing",
    label: "Door Check Missing",
    file: `${BASE}/walkthrough-alerts/door-check-missing.mp3`,
    category: "walkthrough-alerts",
    description: "A required door check has not been completed",
  },
  opening_walkthrough_reminder: {
    key: "opening_walkthrough_reminder",
    label: "Opening Walkthrough Reminder",
    file: `${BASE}/walkthrough-alerts/opening-walkthrough-reminder.mp3`,
    category: "walkthrough-alerts",
    description: "Reminder to complete the opening walkthrough",
  },
  security_check_reminder: {
    key: "security_check_reminder",
    label: "Security Check Reminder",
    file: `${BASE}/walkthrough-alerts/security-check-reminder.mp3`,
    category: "walkthrough-alerts",
    description: "Reminder to perform a security check",
  },
  geofence_warning: {
    key: "geofence_warning",
    label: "Geo-Fence Warning",
    file: `${BASE}/staff-reminders/geofence-warning.mp3`,
    category: "staff-reminders",
    description: "Staff member is outside the approved geofence area",
  },
  late_warning: {
    key: "late_warning",
    label: "Late Warning",
    file: `${BASE}/staff-reminders/late-warning.mp3`,
    category: "staff-reminders",
    description: "Staff member is running late for their shift",
  },
  leave_now_reminder: {
    key: "leave_now_reminder",
    label: "Leave Now Reminder",
    file: `${BASE}/staff-reminders/leave-now-reminder.mp3`,
    category: "staff-reminders",
    description: "Reminder to leave now to arrive on time",
  },
  missed_clock_out_reminder: {
    key: "missed_clock_out_reminder",
    label: "Missed Clock-Out Reminder",
    file: `${BASE}/staff-reminders/missed-clock-out-reminder.mp3`,
    category: "staff-reminders",
    description: "Staff member forgot to clock out",
  },
  near_geofence_warning: {
    key: "near_geofence_warning",
    label: "Near Geo-Fence Warning",
    file: `${BASE}/staff-reminders/near-geofence-warning.mp3`,
    category: "staff-reminders",
    description: "Staff member is approaching the geofence boundary",
  },
  shift_start_reminder: {
    key: "shift_start_reminder",
    label: "Shift Start Reminder",
    file: `${BASE}/staff-reminders/shift-start-reminder.mp3`,
    category: "staff-reminders",
    description: "Reminder that a shift is about to start",
  },
  shift_started: {
    key: "shift_started",
    label: "Shift Started",
    file: `${BASE}/staff-reminders/shift-started.mp3`,
    category: "staff-reminders",
    description: "Shift has officially started",
  },
  successful_clock_in: {
    key: "successful_clock_in",
    label: "Successful Clock-In",
    file: `${BASE}/staff-reminders/successful-clock-in.mp3`,
    category: "staff-reminders",
    description: "Staff member successfully clocked in",
  },
  successful_clock_out: {
    key: "successful_clock_out",
    label: "Successful Clock-Out",
    file: `${BASE}/staff-reminders/successful-clock-out.mp3`,
    category: "staff-reminders",
    description: "Staff member successfully clocked out",
  },
  suspicious_location_warning: {
    key: "suspicious_location_warning",
    label: "Suspicious Location Warning",
    file: `${BASE}/staff-reminders/suspicious-location-warning.mp3`,
    category: "staff-reminders",
    description: "Clock-in from an unusual or suspicious location",
  },
  wake_up_reminder: {
    key: "wake_up_reminder",
    label: "Wake-Up Reminder",
    file: `${BASE}/staff-reminders/wake-up-reminder.mp3`,
    category: "staff-reminders",
    description: "Wake-up reminder before an early shift",
  },
}

export const ALERT_SOUND_LIST = Object.values(ALERT_SOUNDS)

export function getAlertSoundUrl(key: AlertSoundKey): string {
  return ALERT_SOUNDS[key]?.file ?? ""
}

export function getAlertSoundLabel(key: AlertSoundKey): string {
  return ALERT_SOUNDS[key]?.label ?? key
}

const audioCache = new Map<string, HTMLAudioElement>()

export function preloadAlertSound(key: AlertSoundKey): HTMLAudioElement | null {
  if (audioCache.has(key)) return audioCache.get(key)!
  const url = getAlertSoundUrl(key)
  if (!url) return null
  const audio = new Audio(url)
  audio.preload = "auto"
  audioCache.set(key, audio)
  return audio
}

export function playAlertSound(key: AlertSoundKey): Promise<void> {
  return new Promise((resolve) => {
    const url = getAlertSoundUrl(key)
    if (!url) { resolve(); return }
    let audio = audioCache.get(key)
    if (!audio) {
      audio = new Audio(url)
      audio.preload = "auto"
      audioCache.set(key, audio)
    }
    audio.currentTime = 0
    audio.play().then(() => resolve()).catch(() => resolve())
  })
}

export function playAlertSoundForType(type: string): Promise<void> {
  const typeToSound: Record<string, AlertSoundKey> = {
    message: "message_received",
    shift_reminder: "break_reminder",
    staffing_gap: "app_sync_failed",
    warning: "idle_reminder",
    info: "all_tasks_complete",
    ticket_assigned: "manager_task_overdue",
    geofence_violation: "manager_geofence_alert",
    late_clock_in: "manager_late_alert",
    missed_walkthrough: "manager_missed_walkthrough",
    safety_incident: "manager_safety_alert",
    badge_awarded: "badge_earned",
    blocked_exit: "blocked_exit_warning",
    hazard_reminder: "hazard_reminder",
    safety_issue_reported: "safety_issue_reported",
    security_issue_reported: "security_issue_reported",
    badge_always_on_time: "badge_always_on_time",
    badge_perfect_attendance: "badge_perfect_attendance",
    badge_pristine_space: "badge_pristine_space",
    badge_safety_watch: "badge_safety_watch",
    badge_secure_building: "badge_secure_building",
    badge_team_player: "badge_team_player",
    badge_self_starter: "badge_self_starter",
    badge_event_ready: "badge_event_ready",
    badge_reset_champion: "badge_reset_champion",
    badge_checklist_champion: "badge_checklist_champion",
    badge_growth_mindset: "badge_growth_mindset",
    badge_above_beyond: "badge_above_beyond",
    eom_nomination: "eom_nomination",
    eom_winner: "eom_winner",
    leaderboard_jump: "leaderboard_jump",
    points_deducted: "points_deducted",
    top_five: "top_five_alert",
    task_note_required: "task_note_required",
    task_photo_required: "task_photo_required",
    task_assigned: "task_assigned",
    task_completed: "task_completed",
    task_due_soon: "task_due_soon",
    task_overdue: "task_overdue",
    urgent_task: "urgent_task",
    checklist_incomplete: "checklist_incomplete",
    closing_walkthrough_reminder: "closing_walkthrough_reminder",
    door_check_missing: "door_check_missing",
    opening_walkthrough_reminder: "opening_walkthrough_reminder",
    security_check_reminder: "security_check_reminder",
    geofence_warning: "geofence_warning",
    late_warning: "late_warning",
    leave_now_reminder: "leave_now_reminder",
    missed_clock_out: "missed_clock_out_reminder",
    near_geofence_warning: "near_geofence_warning",
    shift_start_reminder: "shift_start_reminder",
    shift_started: "shift_started",
    successful_clock_in: "successful_clock_in",
    successful_clock_out: "successful_clock_out",
    suspicious_location: "suspicious_location_warning",
    wake_up_reminder: "wake_up_reminder",
  }
  const soundKey = typeToSound[type] || "all_tasks_complete"
  return playAlertSound(soundKey)
}
