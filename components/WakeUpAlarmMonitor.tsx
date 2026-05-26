"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { markAlarmTriggered } from "@/lib/actions/wake-up-alarm"
import { AlarmClock, X } from "lucide-react"

export function WakeUpAlarmMonitor() {
  const [notification, setNotification] = useState<{ message: string } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio("/audio/staff-reminders/wake-up-reminder.mp3")
    audioRef.current.preload = "auto"
  }, [])

  useEffect(() => {
    let userCheckedIn = false

    async function checkAlarm() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: alarm } = await supabase
          .from("staff_wake_up_alarms")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()

        if (!alarm || !alarm.enabled) return

        const now = new Date()
        const today = now.toISOString().split("T")[0]

        if (alarm.last_triggered_date === today) return

        const currentMinutes = now.getHours() * 60 + now.getMinutes()
        const [hours, minutes] = alarm.wake_up_time.split(":").map(Number)
        const alarmMinutes = hours * 60 + minutes

        if (Math.abs(currentMinutes - alarmMinutes) <= 1) {
          audioRef.current?.play().catch(() => {})

          setNotification({ message: "Wake up! Your shift is approaching." })

          await markAlarmTriggered()

          setTimeout(() => setNotification(null), 10000)
        }
      } catch (err) {
        // silent
      }
    }

    const startInterval = () => {
      if (!userCheckedIn) {
        checkAlarm()
        intervalRef.current = setInterval(checkAlarm, 30000)
        userCheckedIn = true
      }
    }

    const delay = setTimeout(startInterval, 5000)

    return () => {
      clearTimeout(delay)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  if (!notification) return null

  return (
    <div className="fixed top-20 right-4 z-[9999] max-w-sm animate-in slide-in-from-top-2 duration-300">
      <div className="bg-primary text-white rounded-2xl shadow-2xl p-4 border border-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <AlarmClock className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Wake-Up Alarm</p>
            <p className="text-sm text-white/80 mt-0.5">{notification.message}</p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
