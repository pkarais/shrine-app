"use client"

import { useState, useEffect } from "react"

export function BreakCountdown() {
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [progress, setProgress] = useState(0)
  const [nextBreak, setNextBreak] = useState("")

  useEffect(() => {
    const now = new Date()
    const breakTimes = [
      { label: "First Break", hour: 13.5 },
      { label: "Second Break", hour: 17.5 },
      { label: "Final Break", hour: 20.5 },
    ]

    const currentHour = now.getHours() + now.getMinutes() / 60
    const upcoming = breakTimes.find((b) => b.hour > currentHour)

    if (upcoming) {
      const breakTime = new Date(now)
      breakTime.setHours(Math.floor(upcoming.hour), (upcoming.hour % 1) * 60, 0, 0)
      const diff = breakTime.getTime() - now.getTime()
      setTimeRemaining(diff)
      setNextBreak(upcoming.label)

      const totalWorkTime = (upcoming.hour - 8) * 3600000
      const elapsed = now.getTime() - new Date(now).setHours(8, 0, 0, 0)
      setProgress(Math.min(100, Math.max(0, (elapsed / totalWorkTime) * 100)))
    }

    const interval = setInterval(() => {
      const n = new Date()
      const ch = n.getHours() + n.getMinutes() / 60
      const up = breakTimes.find((b) => b.hour > ch)
      if (up) {
        const bt = new Date(n)
        bt.setHours(Math.floor(up.hour), (up.hour % 1) * 60, 0, 0)
        setTimeRemaining(bt.getTime() - n.getTime())
        const tw = (up.hour - 8) * 3600000
        const el = n.getTime() - new Date(n).setHours(8, 0, 0, 0)
        setProgress(Math.min(100, Math.max(0, (el / tw) * 100)))
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const hours = Math.floor(timeRemaining / 3600000)
  const minutes = Math.floor((timeRemaining % 3600000) / 60000)
  const display = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`

  return (
    <div className="bg-surface-container-low rounded-[2rem] p-8 flex flex-col justify-between min-h-[320px]">
      <div>
        <span className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-4 block">
          Next Scheduled Break
        </span>
        <div className="flex items-baseline gap-1">
          <span className="font-headline text-6xl font-extrabold text-primary">{display}</span>
          <span className="font-headline text-xl text-on-surface-variant">remaining</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-on-surface-variant font-medium">Progress to {nextBreak}</span>
          <span className="text-primary font-bold">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1 bg-primary-fixed text-on-primary-fixed text-[10px] font-bold rounded-full uppercase tracking-tighter">
            {Math.round(progress / 20) * 2.5}H Done
          </span>
          <span className="px-3 py-1 bg-surface-container-highest text-on-surface-variant text-[10px] font-bold rounded-full uppercase tracking-tighter">
            5.5H Next
          </span>
          <span className="px-3 py-1 bg-surface-container-highest text-on-surface-variant text-[10px] font-bold rounded-full uppercase tracking-tighter">
            8.5H Final
          </span>
        </div>
      </div>
    </div>
  )
}
