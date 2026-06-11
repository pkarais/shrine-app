"use client"

import { useState, useEffect } from "react"
import { getActiveShift } from "@/lib/actions/clock-in"

interface Break {
  label: string
  startOffsetMinutes: number
  durationMinutes: number
}

const BREAKS: Break[] = [
  { label: "First Break", startOffsetMinutes: 90, durationMinutes: 15 },   // 1:30 after clock-in
  { label: "Lunch Break", startOffsetMinutes: 180, durationMinutes: 30 },    // 3:00 after clock-in
  { label: "Final Break", startOffsetMinutes: 300, durationMinutes: 15 },   // 5:00 after clock-in
]

export function BreakCountdown() {
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [progress, setProgress] = useState(0)
  const [nextBreak, setNextBreak] = useState("")
  const [clockInTime, setClockInTime] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchShift() {
      try {
        const shift = await getActiveShift()
        if (shift?.clock_in) {
          setClockInTime(new Date(shift.clock_in))
        } else {
          setClockInTime(null)
        }
      } catch (e) {
        console.error("Failed to fetch active shift:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchShift()

    // Re-fetch when a sibling card (ShiftTimer / ClockInCard) clocks in
    // or out, so this card stays in sync without a page reload.
    if (typeof window === "undefined") return
    const onShiftChanged = () => {
      setLoading(true)
      fetchShift()
    }
    window.addEventListener("shift-changed", onShiftChanged)
    return () => window.removeEventListener("shift-changed", onShiftChanged)
  }, [])

  useEffect(() => {
    if (!clockInTime) return
    const startTime = clockInTime

    function updateCountdown() {
      const now = new Date()
      const elapsedMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60)

      // Find the next upcoming break
      const upcoming = BREAKS.find((b) => elapsedMinutes < b.startOffsetMinutes)

      if (upcoming) {
        const breakStartMinutes = upcoming.startOffsetMinutes
        const minutesUntilBreak = breakStartMinutes - elapsedMinutes
        const totalWorkTime = breakStartMinutes * 60 * 1000
        const elapsed = elapsedMinutes * 60 * 1000

        setTimeRemaining(minutesUntilBreak * 60 * 1000)
        setNextBreak(upcoming.label)
        setProgress(Math.min(100, Math.max(0, (elapsed / totalWorkTime) * 100)))
      } else {
        // All breaks passed
        setTimeRemaining(0)
        setNextBreak("All breaks completed")
        setProgress(100)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [clockInTime])

  const formatTime = (ms: number) => {
    if (ms <= 0) return "00:00"
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    }
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  if (loading) {
    return (
      <div className="bg-surface-container rounded-xl p-6">
        <p className="text-sm text-on-surface-variant">Loading break schedule...</p>
      </div>
    )
  }

  if (!clockInTime) {
    return (
      <div className="bg-surface-container rounded-xl p-6">
        <h3 className="font-headline font-bold text-lg text-on-surface mb-2">Break Schedule</h3>
        <p className="text-sm text-on-surface-variant">Clock in to see your break schedule.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface-container rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-headline font-bold text-lg text-on-surface">{nextBreak || "Break Schedule"}</h3>
        <span className="text-xs text-on-surface-variant">
          Clock-in: {clockInTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <div className="relative h-2 bg-surface-container-high rounded-full overflow-hidden mb-4">
        <div
          className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="text-center">
        <p className="text-3xl font-black text-on-surface tabular-nums">{formatTime(timeRemaining)}</p>
        <p className="text-xs text-on-surface-variant mt-1">
          {timeRemaining > 0 ? "until next break" : "break time or completed"}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {BREAKS.map((b) => {
          const breakTime = new Date(clockInTime.getTime() + b.startOffsetMinutes * 60 * 1000)
          const isPast = new Date() > breakTime
          return (
            <div
              key={b.label}
              className={`text-center p-2 rounded-lg ${isPast ? "bg-primary/10" : "bg-surface-container-high"}`}
            >
              <p className="text-[10px] font-bold uppercase text-on-surface-variant">{b.label}</p>
              <p className={`text-sm font-bold ${isPast ? "text-primary" : "text-on-surface"}`}>
                {breakTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-[10px] text-on-surface-variant">{b.durationMinutes} min</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
