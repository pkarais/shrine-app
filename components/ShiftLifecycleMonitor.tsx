"use client"

import { useEffect, useRef } from "react"
import { createClient } from "@/utils/supabase/client"
import { logAlertToManager } from "@/lib/actions/manager-alerts"
import { LABOR, BREAKS } from "@/constants"

interface Assignment {
  shift_start: string | null
  shift_end: string | null
}

interface ActiveShift {
  id: string
  clock_in: string
}

const ALERT_LEAD_MINUTES = 30
const LEAVE_NOW_MINUTES = 15
const GRACE_MINUTES = 15

function getDateKey(): string {
  // Use Eastern Time so the dedup key doesn't roll over at 8 PM ET
  // (midnight UTC) — which would cause alerts to re-fire in the evening.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function getMinutesSinceMidnight(date?: Date): number {
  const d = date || new Date()
  return d.getHours() * 60 + d.getMinutes()
}

function parseTimeOrNull(t: string | null): Date | null {
  if (!t) return null
  const d = new Date(t)
  return isNaN(d.getTime()) ? null : d
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function getStorageKey(userId: string): string {
  return `shift_alerts_fired:${userId}:${getDateKey()}`
}

function loadFiredSet(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(getStorageKey(userId))
    return raw ? new Set<string>(JSON.parse(raw)) : new Set<string>()
  } catch {
    return new Set<string>()
  }
}

function saveFiredSet(userId: string, set: Set<string>): void {
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(Array.from(set)))
  } catch {}
}

export function ShiftLifecycleMonitor() {
  const firedRef = useRef<Set<string> | null>(null)
  const userIdRef = useRef<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  function getFiredSet(): Set<string> {
    if (!firedRef.current) {
      firedRef.current = userIdRef.current ? loadFiredSet(userIdRef.current) : new Set<string>()
    }
    return firedRef.current
  }

  function markFired(id: string) {
    const key = `${id}:${getDateKey()}`
    const set = getFiredSet()
    set.add(key)
    if (userIdRef.current) saveFiredSet(userIdRef.current, set)
  }

  function hasFired(id: string): boolean {
    return getFiredSet().has(`${id}:${getDateKey()}`)
  }

  function playSound(key: string) {
    try {
      const audioKey = key as any
      import("@/lib/audio/alert-sounds").then(({ playAlertSound }) => {
        playAlertSound(audioKey)
      })
    } catch {}
  }

  async function insertNotification(userId: string, title: string, body: string, type = "shift_reminder", referenceId?: string) {
    try {
      const { createNotification } = await import("@/lib/actions/notifications")
      await createNotification(userId, title, body, type, referenceId)
    } catch {}
  }

  async function fireAlert(
    alertId: string,
    userId: string,
    soundKey: string,
    title: string,
    body: string,
    notifyType = "shift_reminder"
  ) {
    if (hasFired(alertId)) return
    markFired(alertId)
    playSound(soundKey)
    // Use alertId+dateKey as referenceId — same as hasFired key, prevents DB duplicates across reloads
    insertNotification(userId, title, body, notifyType, `${alertId}_${getDateKey()}`)
  }

  async function check() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Seed userId so localStorage key is user-scoped (prevents cross-user and cross-tab duplicate fires)
      if (!userIdRef.current) {
        userIdRef.current = user.id
        firedRef.current = loadFiredSet(user.id)
      }

      const now = new Date()
      const todayStr = getDateKey()
      const todayStart = `${todayStr}T00:00:00Z`
      const todayEnd = `${todayStr}T23:59:59Z`

      const { data: assignments } = await supabase
        .from("staff_assignments")
        .select("shift_start, shift_end")
        .eq("user_id", user.id)
        .gte("shift_start", todayStart)
        .lte("shift_start", todayEnd)
        .order("shift_start", { ascending: true })
        .limit(1)

      const assignment: Assignment | null = assignments && assignments.length > 0 ? assignments[0] : null
      const scheduledStart = assignment ? parseTimeOrNull(assignment.shift_start) : null
      const scheduledEnd = assignment ? parseTimeOrNull(assignment.shift_end) : null

      const { data: activeShifts } = await supabase
        .from("shifts")
        .select("id, clock_in")
        .eq("user_id", user.id)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1)

      const activeShift: ActiveShift | null = activeShifts && activeShifts.length > 0 ? activeShifts[0] : null
      const clockInTime = activeShift ? new Date(activeShift.clock_in) : null
      const nowMinutes = getMinutesSinceMidnight(now)

      // 1. LEAVE NOW REMINDER: 15 min before scheduled start
      if (scheduledStart && !activeShift) {
        const startMin = getMinutesSinceMidnight(scheduledStart)
        const leaveNowMin = startMin - LEAVE_NOW_MINUTES
        if (nowMinutes >= leaveNowMin && nowMinutes < startMin) {
          await fireAlert("leave_now", user.id, "leave_now_reminder",
            "Leave Now", `Your shift starts at ${formatTime(scheduledStart)}. Leave now to arrive on time.`)
        }
      }

      // 2. SHIFT START REMINDER: 30 min before scheduled start
      if (scheduledStart && !activeShift) {
        const startMin = getMinutesSinceMidnight(scheduledStart)
        const remindMin = startMin - ALERT_LEAD_MINUTES
        if (nowMinutes >= remindMin && nowMinutes < startMin) {
          await fireAlert("shift_start", user.id, "shift_start_reminder",
            "Shift Starting Soon", `Your shift starts at ${formatTime(scheduledStart)}. Please prepare.`)
        }
      }

      // 3. SHIFT STARTED: when shift start time arrives and clocked in
      if (scheduledStart && activeShift) {
        const startMin = getMinutesSinceMidnight(scheduledStart)
        if (nowMinutes >= startMin && nowMinutes < startMin + 5) {
          await fireAlert("shift_started", user.id, "shift_started",
            "Shift Started", `Your shift has started. Welcome!`)
        }
      }

      // 4. LATE WARNING: 15 min after scheduled start if not clocked in
      if (scheduledStart && !activeShift) {
        const startMin = getMinutesSinceMidnight(scheduledStart)
        const lateMin = startMin + GRACE_MINUTES
        if (nowMinutes >= lateMin && nowMinutes < lateMin + 5) {
          await fireAlert("late_warning", user.id, "late_warning",
            "Late for Shift", `Your shift was scheduled at ${formatTime(scheduledStart)}. Please clock in now.`)
          // Notify manager — fire-and-forget, don't block staff alert
          try {
            const minsLate = nowMinutes - startMin
            await logAlertToManager({
              type: "late_clock_in",
              message: `Staff has not clocked in — ${minsLate} min past scheduled start of ${formatTime(scheduledStart)}.`,
              severity: "warning",
              userId: user.id,
            })
          } catch {}
        }
      }

      // 5. BREAK REMINDERS: based on elapsed work time
      if (clockInTime) {
        const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)

        if (hoursWorked >= BREAKS.FIRST.TRIGGER_HOURS && hoursWorked < BREAKS.FIRST.TRIGGER_HOURS + 0.1) {
          await fireAlert("break_first", user.id, "break_reminder",
            "Break Time", `You've worked ${BREAKS.FIRST.TRIGGER_HOURS}h. Time for a ${BREAKS.FIRST.DURATION_MINUTES}-min paid break.`)
        }
        if (hoursWorked >= BREAKS.LUNCH.TRIGGER_HOURS && hoursWorked < BREAKS.LUNCH.TRIGGER_HOURS + 0.1) {
          await fireAlert("break_lunch", user.id, "break_reminder",
            "Lunch Time", `You've worked ${BREAKS.LUNCH.TRIGGER_HOURS}h. Time for a ${BREAKS.LUNCH.DURATION_MINUTES}-min unpaid lunch.`)
        }
        if (hoursWorked >= BREAKS.SECOND.TRIGGER_HOURS && hoursWorked < BREAKS.SECOND.TRIGGER_HOURS + 0.1) {
          await fireAlert("break_second", user.id, "break_reminder",
            "Break Time", `You've worked ${BREAKS.SECOND.TRIGGER_HOURS}h. Time for a ${BREAKS.SECOND.DURATION_MINUTES}-min paid break.`)
        }

        // Check active break duration (only if activeShift exists)
        if (activeShift) {
          const { data: activeBreak } = await supabase
            .from("breaks")
            .select("break_start")
            .eq("shift_id", activeShift.id)
            .is("break_end", null)
            .order("break_start", { ascending: false })
            .limit(1)
            .maybeSingle()

          if (activeBreak) {
            const breakStart = new Date(activeBreak.break_start)
            const breakMinutes = (now.getTime() - breakStart.getTime()) / (1000 * 60)
            if (breakMinutes >= 15 && breakMinutes < 16) {
              await fireAlert("break_over", user.id, "break_over_reminder",
                "Break Over", `Your break has ended. Time to return to work.`)
            }
          }
        }
      }

      // 6. END OF SHIFT REMINDER: 30 min before scheduled end
      if (scheduledEnd && activeShift) {
        const endMin = getMinutesSinceMidnight(scheduledEnd)
        const remindEndMin = endMin - ALERT_LEAD_MINUTES
        if (nowMinutes >= remindEndMin && nowMinutes < endMin) {
          await fireAlert("end_of_shift", user.id, "end_of_shift_reminder",
            "Shift Ending Soon", `Your shift ends at ${formatTime(scheduledEnd)}. Please prepare to wrap up.`)
        }
      }

      // 7. END OF SHIFT based on standard shift length if no assignment
      if (!scheduledEnd && clockInTime) {
        const shiftEndTime = new Date(clockInTime.getTime() + LABOR.SHIFT_LENGTH_HOURS * 60 * 60 * 1000)
        const minsUntilEnd = (shiftEndTime.getTime() - now.getTime()) / (1000 * 60)
        if (minsUntilEnd <= ALERT_LEAD_MINUTES && minsUntilEnd > 0) {
          await fireAlert("end_of_shift_auto", user.id, "end_of_shift_reminder",
            "Shift Ending Soon", `Your shift ends at ${formatTime(shiftEndTime)}. Please prepare to wrap up.`)
        }
      }

      // 8. MISSED CLOCK-OUT: after scheduled end + 15 min if still active
      if (activeShift) {
        const endBoundary = scheduledEnd
          ? new Date(scheduledEnd.getTime() + GRACE_MINUTES * 60 * 1000)
          : clockInTime
            ? new Date(clockInTime.getTime() + (LABOR.SHIFT_LENGTH_HOURS + GRACE_MINUTES / 60) * 60 * 60 * 1000)
            : null

        if (endBoundary && now > endBoundary) {
          await fireAlert("missed_clock_out", user.id, "missed_clock_out_reminder",
            "Missed Clock-Out", "Your shift ended over 15 minutes ago. Please clock out.")
        }
      }

      // 9. ALL TASKS COMPLETE check — only fires if end_of_shift_auto already fired (avoids double-alert at shift boundary)
      if (activeShift && clockInTime && hasFired("end_of_shift_auto")) {
        const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)
        if (hoursWorked >= LABOR.SHIFT_LENGTH_HOURS && hoursWorked < LABOR.SHIFT_LENGTH_HOURS + 0.1) {
          await fireAlert("all_tasks_complete", user.id, "all_tasks_complete",
            "Shift Complete", "You have reached the end of your standard shift hours.")
        }
      }

    } catch {
      // silent
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const setup = setTimeout(() => {
      check()
      intervalRef.current = setInterval(check, 30000)
    }, 5000)

    return () => {
      clearTimeout(setup)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return null
}
