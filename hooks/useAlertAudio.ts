"use client"

import { useCallback, useEffect, useRef } from "react"
import { playAlertSound, playAlertSoundForType, preloadAlertSound, type AlertSoundKey } from "@/lib/audio/alert-sounds"

export function useAlertAudio() {
  const enabledRef = useRef(true)
  const userInteractedRef = useRef(false)

  useEffect(() => {
    const handler = () => { userInteractedRef.current = true }
    window.addEventListener("click", handler, { once: true })
    window.addEventListener("keydown", handler, { once: true })
    window.addEventListener("touchstart", handler, { once: true })
    return () => {
      window.removeEventListener("click", handler)
      window.removeEventListener("keydown", handler)
      window.removeEventListener("touchstart", handler)
    }
  }, [])

  const play = useCallback(async (key: AlertSoundKey) => {
    if (!enabledRef.current) return
    playAlertSound(key)
  }, [])

  const playForType = useCallback(async (type: string) => {
    if (!enabledRef.current) return
    playAlertSoundForType(type)
  }, [])

  const preloadAll = useCallback(() => {
    const keys: AlertSoundKey[] = [
      "all_tasks_complete", "app_sync_failed", "break_over_reminder",
      "break_reminder", "end_of_shift_reminder", "idle_reminder",
      "location_permission_reminder", "low_battery_reminder",
      "manager_geofence_alert", "manager_late_alert",
      "manager_missed_walkthrough", "manager_safety_alert", "manager_task_overdue",
      "eom_nomination", "eom_winner", "leaderboard_jump",
      "points_deducted", "top_five_alert",
      "badge_earned", "badge_above_beyond", "badge_always_on_time",
      "badge_checklist_champion", "badge_event_ready", "badge_growth_mindset",
      "badge_perfect_attendance", "badge_pristine_space", "badge_reset_champion",
      "badge_safety_watch", "badge_secure_building", "badge_self_starter",
      "badge_team_player",
      "blocked_exit_warning", "hazard_reminder",
      "safety_issue_reported", "security_issue_reported",
      "task_note_required", "task_photo_required", "task_assigned",
      "task_completed", "task_due_soon", "task_overdue", "urgent_task",
      "checklist_incomplete", "closing_walkthrough_reminder",
      "door_check_missing", "opening_walkthrough_reminder",
      "security_check_reminder",
      "geofence_warning", "late_warning", "leave_now_reminder",
      "missed_clock_out_reminder", "near_geofence_warning",
      "shift_start_reminder", "shift_started",
      "successful_clock_in", "successful_clock_out",
      "suspicious_location_warning", "wake_up_reminder",
    ]
    keys.forEach(preloadAlertSound)
  }, [])

  return { play, playForType, preloadAll, enabled: enabledRef }
}

export { AlertSoundKey }
