"use client"

import { useEffect, useState, useCallback } from "react"
import { Clock, Coffee, Play, Square, ShieldCheck, Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { clockIn, clockOut, getActiveShift } from "@/lib/actions/clock-in"
import { startBreak, endBreak, getActiveBreak } from "@/lib/actions/breaks"
import { getNextBreakInfo, getShiftProgress } from "@/lib/labor-math"
import { useAlertAudio } from "@/hooks/useAlertAudio"
import { createClient } from "@/utils/supabase/client"
import { getManagerShiftReport, generateShiftReportCSV } from "@/lib/actions/shift-report"

interface Shift {
  id: string
  clock_in: string
  clock_out?: string | null
  event_id?: number | null
}

export function ShiftTimer() {
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [activeBreakId, setActiveBreakId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [breakInfo, setBreakInfo] = useState<any>(null)
  const [shiftProgress, setShiftProgress] = useState<any>(null)
  const [activeShift, setActiveShift] = useState<Shift | null>(null)
  const [isManager, setIsManager] = useState(false)
  const [loading, setLoading] = useState(true)
  const [generatingReport, setGeneratingReport] = useState(false)
  const { play } = useAlertAudio()

  // Fetch role + active shift on mount
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      setIsManager(profile?.role === "manager")

      const shift = await getActiveShift()
      if (shift) {
        setActiveShift(shift)
      }
      setLoading(false)
    }
    init()
  }, [])

  const isActive = !!activeShift && !activeShift.clock_out

  // Timer + break info updater
  useEffect(() => {
    if (!isActive || !activeShift) return

    setIsRunning(true)
    const start = new Date(activeShift.clock_in).getTime()
    const clockInDate = new Date(activeShift.clock_in)

    const interval = setInterval(() => {
      const now = Date.now()
      // Clamp to 0 so a clock-in timestamp slightly in the future (clock skew)
      // never produces a "-1:-21:-45" style display.
      setElapsed(Math.max(0, now - start))
      setBreakInfo(getNextBreakInfo(clockInDate, new Date(now)))
      setShiftProgress(getShiftProgress(clockInDate, new Date(now)))
    }, 1000)

    // Check for active break
    getActiveBreak(activeShift.id).then((breakRecord: any) => {
      if (breakRecord) {
        setIsOnBreak(true)
        setActiveBreakId(breakRecord.id)
      }
    })

    return () => clearInterval(interval)
  }, [isActive, activeShift])

  // Manager off-site clock-in (no GPS)
  const handleManagerClockIn = useCallback(async () => {
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Get current or next event
      const { data: events } = await supabase
        .from("events")
        .select("id")
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(1)

      const eventId = events?.[0]?.id ?? 1

      // Manager quick action explicitly allows off-site clock-in.
      const result = await clockIn(eventId, 0, 0, undefined, { allowOffsiteManager: true })
      if (!result.success) {
        setError(result.error || "Failed to clock in")
        return
      }
      setActiveShift(result.shift)
      setIsRunning(true)
      play("successful_clock_in")
      // Notify sibling dashboard cards (ClockInCard, BreakCountdown) so
      // they re-fetch the active shift instead of waiting for a full
      // page reload.
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("shift-changed"))
      }
    } catch (err: any) {
      setError(err.message || "Failed to clock in")
    }
  }, [play])

  const handleClockOut = useCallback(async () => {
    if (!activeShift?.id) return
    setError(null)
    try {
      await clockOut(activeShift.id)
      setActiveShift(null)
      setIsRunning(false)
      setElapsed(0)
      setBreakInfo(null)
      setShiftProgress(null)
      play("successful_clock_out")
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("shift-changed"))
      }
    } catch (err: any) {
      setError(err.message || "Failed to clock out")
    }
  }, [activeShift, play])

  const handleBreak = useCallback(async () => {
    if (!activeShift?.id) return
    setError(null)
    try {
      if (isOnBreak && activeBreakId) {
        await endBreak(activeBreakId)
        setIsOnBreak(false)
        setActiveBreakId(null)
        play("break_over_reminder")
      } else {
        const result = await startBreak(activeShift.id)
        setIsOnBreak(true)
        setActiveBreakId(result.breakId)
        play("break_reminder")
      }
    } catch (err: any) {
      setError(err.message || "Failed to update break status")
    }
  }, [isOnBreak, activeBreakId, activeShift, play])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  if (loading) {
    return (
      <section className="card-surface p-8 flex flex-col items-center gap-6 min-h-[280px]">
        <div className="animate-pulse w-full h-full bg-surface-container rounded-xl" />
      </section>
    )
  }

  const statusLabel = isOnBreak ? "On Break" : isActive ? "Clocked In" : "Not Clocked In"
  const statusColor = isOnBreak ? "var(--secondary)" : isActive ? "var(--primary)" : "var(--on-surface-variant)"

  return (
    <section className="card-surface p-8 flex flex-col items-center gap-6">
      {/* Header */}
      <div className="flex items-center gap-2" style={{ color: statusColor }}>
        <Clock className="w-4 h-4" />
        <span className="text-xs label-text">{statusLabel}</span>
        {isManager && (
          <span className="ml-1 px-2 py-0.5 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full uppercase">
            Manager
          </span>
        )}
      </div>

      {/* Clock-in timestamp */}
      {isActive && activeShift && (
        <div className="text-xs text-[var(--on-surface-variant)] -mt-2">
          Clocked in at{" "}
          <span className="font-bold text-[var(--on-surface)]">
            {new Date(activeShift.clock_in).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      )}

      {/* Timer */}
      <div className="display-lg font-display" style={{ color: statusColor }}>
        {formatTime(elapsed)}
      </div>

      {/* Progress */}
      {shiftProgress && (
        <div className="w-full space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--on-surface-variant)]">{shiftProgress.hoursWorked}h worked · {shiftProgress.paidHours}h paid</span>
            {shiftProgress.isOvertime && (
              <span className="font-bold text-[var(--secondary)]">+{shiftProgress.overtimeHours}h OT</span>
            )}
          </div>
          <div className="h-2 bg-[var(--surface-container-highest)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--primary)] rounded-full transition-all"
              style={{ width: `${Math.min(100, shiftProgress.progressPercent)}%` }}
            />
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <span className="px-3 py-1 bg-[var(--primary-fixed)] text-[var(--on-primary-fixed)] text-[10px] font-bold rounded-full uppercase tracking-tighter">
              {breakInfo?.breakNumber === 1 ? "1st break → 1.5h" : breakInfo?.breakNumber === 2 ? "Lunch → 3h" : breakInfo?.breakNumber === 3 ? "Final break → 5h" : "All breaks done"}
            </span>
            <span className="px-3 py-1 bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)] text-[10px] font-bold rounded-full uppercase tracking-tighter">
              8h standard
            </span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 flex-wrap justify-center">
        {!isActive && isManager && (
          <Button onClick={handleManagerClockIn} variant="gold" size="lg">
            <ShieldCheck className="w-4 h-4 mr-2" /> Manager Clock-In
          </Button>
        )}
        {isActive && (
          <>
            <Button onClick={handleBreak} variant={isOnBreak ? "gold" : "outline"}>
              <Coffee className="w-4 h-4 mr-1" /> {isOnBreak ? "End Break" : "On Break"}
            </Button>
            <Button onClick={handleClockOut} variant="danger">
              <Square className="w-4 h-4 mr-1" /> Clock Out
            </Button>
          </>
        )}
      </div>

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      {/* Export Shift Report */}
      {isManager && (
        <button
          onClick={async () => {
            setGeneratingReport(true)
            try {
              const report = await getManagerShiftReport(activeShift?.id)
              if (!report) {
                alert("No shift found to report on.")
                return
              }
              const csv = await generateShiftReportCSV(report)
              const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
              const link = document.createElement("a")
              link.setAttribute("href", dataUri)
              link.setAttribute("download", `manager-shift-report-${new Date().toISOString().slice(0, 10)}.csv`)
              document.body.appendChild(link)
              link.click()
              document.body.removeChild(link)
            } catch (e: any) {
              alert("Failed to generate report: " + e.message)
            } finally {
              setGeneratingReport(false)
            }
          }}
          disabled={generatingReport}
          className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface rounded-xl text-sm font-medium hover:bg-surface-container-highest transition-colors disabled:opacity-50"
        >
          <FileText className="w-4 h-4" />
          {generatingReport ? "Generating..." : "Export Shift Report"}
        </button>
      )}

      {isManager && !isActive && (
        <p className="text-xs text-on-surface-variant text-center">
          Manager clock-in bypasses GPS verification. Use responsibly.
        </p>
      )}
    </section>
  )
}
