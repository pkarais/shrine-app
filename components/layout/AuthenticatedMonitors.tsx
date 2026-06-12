"use client"

// FIX: This wrapper ensures the three background monitors (WakeUpAlarmMonitor,
// ShiftLifecycleMonitor, RecognitionMonitor) only mount and start polling
// Supabase AFTER a user session is confirmed. Without this guard they were
// firing auth.getUser() calls every 30 s on public/unauthenticated pages
// (landing, login, signup, privacy, etc.), wasting API quota and adding
// unnecessary DB load for anonymous visitors.

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { WakeUpAlarmMonitor } from "@/components/WakeUpAlarmMonitor"
import { ShiftLifecycleMonitor } from "@/components/ShiftLifecycleMonitor"
import { RecognitionMonitor } from "@/components/RecognitionMonitor"

export function AuthenticatedMonitors() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    // Check initial session state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
    }).catch(() => {
      setIsAuthenticated(false)
    })

    // Keep in sync with sign-in / sign-out events so monitors
    // start immediately after login and stop immediately after logout.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!isAuthenticated) return null

  return (
    <>
      <WakeUpAlarmMonitor />
      <ShiftLifecycleMonitor />
      <RecognitionMonitor />
    </>
  )
}
