"use client"

import { useEffect, useRef } from "react"
import { updateUserSession } from "@/lib/actions/user-sessions"

/**
 * SessionHeartbeat
 *
 * Keeps the user's row in user_sessions current so the manager "online now"
 * view stays accurate — including on mobile where the browser suspends JS
 * when the screen turns off.
 *
 * Strategy:
 *  • Fires immediately on mount.
 *  • Fires every 60 s via setInterval (stays under any 3-min DB expiry window).
 *  • Fires immediately when the page becomes visible again after the phone
 *    wakes (visibilitychange → "visible"). This is the key mobile fix — the
 *    interval is frozen while the screen is off, so we need the wake event.
 *  • Fires immediately when the network comes back online after sleep/airplane
 *    mode (the "online" window event).
 */
export function SessionHeartbeat() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastBeatRef = useRef<number>(0)

  useEffect(() => {
    const beat = () => {
      // Debounce: skip if we fired less than 10 s ago (prevents double-fire
      // when both "online" and "visibilitychange" trigger at the same instant).
      const now = Date.now()
      if (now - lastBeatRef.current < 10_000) return
      lastBeatRef.current = now
      updateUserSession().catch(() => {})
    }

    // Immediate beat on mount
    beat()

    // Periodic heartbeat — 60 s is well within a 3-min expiry window and
    // leaves ample buffer for slow mobile wake latency.
    intervalRef.current = setInterval(beat, 60_000)

    // ── Mobile wake-up fix ────────────────────────────────────────────────
    // visibilitychange fires when the phone screen turns back on and the
    // browser tab becomes active again. setInterval is frozen during sleep,
    // so this is the only reliable way to catch the wake event.
    const onVisible = () => {
      if (document.visibilityState === "visible") beat()
    }

    // online fires when the device reconnects to the network after
    // airplane mode or a complete network drop during sleep.
    const onOnline = () => beat()

    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("online", onOnline)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("online", onOnline)
    }
  }, [])

  return null
}
