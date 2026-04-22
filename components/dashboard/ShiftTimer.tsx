"use client"

import { useEffect, useState, useCallback } from "react"
import { Clock, Play, Square, Coffee } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { clockIn, clockOut } from "@/lib/actions/clock-in"
import { startBreak, endBreak, getActiveBreak } from "@/lib/actions/breaks"
import { checkGeofence } from "@/lib/geofence"
import { getNextBreakInfo, getShiftProgress } from "@/lib/labor-math"

const SHRINE_LAT = 40.7081
const SHRINE_LON = -74.0173
const GEOFENCE_RADIUS = 100

interface Shift {
  id?: string
  clock_in: string
  clock_out?: string | null
  event_id?: number
  events?: { title: string } | null
}

export function ShiftTimer({ currentShift }: { currentShift?: Shift | null }) {
  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [isOnBreak, setIsOnBreak] = useState(false)
  const [activeBreakId, setActiveBreakId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [breakInfo, setBreakInfo] = useState<{ nextBreak: string; remainingMinutes: number; breakDuration: number; breakNumber: number; isPaid: boolean } | null>(null)
  const [shiftProgress, setShiftProgress] = useState<{ hoursWorked: number; paidHours: number; progressPercent: number; isOvertime: boolean; overtimeHours: number } | null>(null)

  const isActive = !!currentShift && !currentShift.clock_out

  useEffect(() => {
    if (isActive && currentShift.id) {
      setIsRunning(true)
      const start = new Date(currentShift.clock_in).getTime()
      const clockInDate = new Date(currentShift.clock_in)
      const interval = setInterval(() => {
        const now = Date.now()
        setElapsed(now - start)
        setBreakInfo(getNextBreakInfo(clockInDate, new Date(now)))
        setShiftProgress(getShiftProgress(clockInDate, new Date(now)))
      }, 1000)

      getActiveBreak(currentShift.id!).then((breakRecord) => {
        if (breakRecord) {
          setIsOnBreak(true)
          setActiveBreakId(breakRecord.id)
        }
      })

      return () => clearInterval(interval)
    }
  }, [isActive, currentShift])

  const handleClockIn = useCallback(async () => {
    setError(null)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject)
      )

      const { inRange, distance } = checkGeofence(
        pos.coords.latitude,
        pos.coords.longitude,
        SHRINE_LAT,
        SHRINE_LON,
        GEOFENCE_RADIUS
      )

      if (!inRange) {
        setError(`You are ${Math.round(distance)}m from the shrine. Must be within ${GEOFENCE_RADIUS}m to clock in.`)
        return
      }

      if (!currentShift?.event_id) {
        setError("No active event found. Cannot clock in.")
        return
      }

      await clockIn(
        currentShift.event_id,
        pos.coords.latitude,
        pos.coords.longitude
      )
      setIsRunning(true)
    } catch (err: any) {
      setError(err.message || "Failed to clock in")
    }
  }, [currentShift])

  const handleClockOut = useCallback(async () => {
    if (!currentShift?.id) return
    setError(null)
    try {
      await clockOut(currentShift.id)
      setIsRunning(false)
      setElapsed(0)
      setBreakInfo(null)
      setShiftProgress(null)
    } catch (err: any) {
      setError(err.message || "Failed to clock out")
    }
  }, [currentShift])

  const handleBreak = useCallback(async () => {
    if (!currentShift?.id) return
    setError(null)

    try {
      if (isOnBreak && activeBreakId) {
        await endBreak(activeBreakId)
        setIsOnBreak(false)
        setActiveBreakId(null)
      } else {
        const result = await startBreak(currentShift.id)
        setIsOnBreak(true)
        setActiveBreakId(result.breakId)
      }
    } catch (err: any) {
      setError(err.message || "Failed to update break status")
    }
  }, [isOnBreak, activeBreakId, currentShift])

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  const statusLabel = isOnBreak ? "On Break" : isActive || isRunning ? "Clocked In" : "Not Clocked In"
  const statusColor = isOnBreak ? "var(--secondary)" : isActive || isRunning ? "var(--primary)" : "var(--on-surface-variant)"

  return (
    <section className="card-surface p-8 flex flex-col items-center gap-6">
      <div className="flex items-center gap-2" style={{ color: statusColor }}>
        <Clock className="w-4 h-4" />
        <span className="text-xs label-text">{statusLabel}</span>
      </div>
      <div className="display-lg font-display" style={{ color: statusColor }}>
        {formatTime(elapsed)}
      </div>

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
            <span className="px-3 py-1 bg-[var(--primary-fixed)] text-[var(--primary)] text-[10px] font-bold rounded-full uppercase tracking-tighter">
              {breakInfo?.breakNumber === 1 ? "1st break → 2h" : breakInfo?.breakNumber === 2 ? "Lunch → 4.5h" : breakInfo?.breakNumber === 3 ? "2nd break → 6.5h" : "All breaks done"}
            </span>
            <span className="px-3 py-1 bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)] text-[10px] font-bold rounded-full uppercase tracking-tighter">
              8h standard
            </span>
          </div>
        </div>
      )}

      <div className="flex gap-3 flex-wrap justify-center">
        {!isActive && !isRunning && (
          <Button
            onClick={handleClockIn}
            variant="gold"
            size="lg"
          >
            <Play className="w-4 h-4 mr-2" /> Clock In
          </Button>
        )}
        {(isActive || isRunning) && (
          <>
            <Button
              onClick={handleBreak}
              variant={isOnBreak ? "gold" : "outline"}
            >
              <Coffee className="w-4 h-4 mr-1" /> {isOnBreak ? "End Break" : "On Break"}
            </Button>
            <Button
              onClick={handleClockOut}
              variant="danger"
            >
              <Square className="w-4 h-4 mr-1" /> Clock Out
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-sm text-[var(--error)]">{error}</p>}
    </section>
  )
}
