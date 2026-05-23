"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { clockIn, clockOut } from "@/lib/actions/clock-in"
import { createClient } from "@/utils/supabase/client"

export function ClockInCard({ eventId }: { eventId?: number | null }) {
  const [activeShift, setActiveShift] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadShift()
  }, [])

  async function loadShift() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data: shifts } = await supabase
        .from("shifts")
        .select("*")
        .eq("user_id", user.id)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .limit(1)
        .single()

      setActiveShift(shifts)
    } catch {
    } finally {
      setLoading(false)
    }
  }

  async function handleClockIn() {
    setActionLoading(true)
    setError(null)
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              await clockIn(eventId ?? 1, pos.coords.latitude, pos.coords.longitude)
              await loadShift()
            } catch (err: any) {
              setError(err.message)
            } finally {
              setActionLoading(false)
            }
          },
          async (err) => {
            setError("Location access required for clock-in")
            setActionLoading(false)
          }
        )
      } else {
        setError("Geolocation not supported")
        setActionLoading(false)
      }
    } catch (err: any) {
      setError(err.message)
      setActionLoading(false)
    }
  }

  async function handleClockOut() {
    if (!activeShift?.id) return
    setActionLoading(true)
    setError(null)
    try {
      await clockOut(activeShift.id)
      await loadShift()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-surface-container-lowest rounded-[2rem] p-8 flex flex-col justify-between min-h-[320px] relative overflow-hidden">
        <div className="animate-pulse">
          <div className="w-24 h-3 bg-surface-container rounded-full mb-4" />
          <div className="w-40 h-8 bg-surface-container rounded-full" />
        </div>
        <div className="animate-pulse w-full h-14 bg-surface-container rounded-xl" />
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest rounded-[2rem] p-8 flex flex-col justify-between min-h-[320px] relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container opacity-0 group-hover:opacity-5 transition-opacity duration-500" />

      <div className="z-10">
        <div className="flex items-center gap-2 mb-4">
          <span className={`w-2 h-2 rounded-full ${activeShift ? "bg-secondary animate-pulse" : "bg-outline"} `} />
          <span className="font-label text-xs uppercase tracking-widest font-bold" style={{ color: activeShift ? "var(--secondary)" : "var(--on-surface-variant)" }}>
            {activeShift ? "On-site Detected" : "Off-site"}
          </span>
        </div>
        <h3 className="font-headline text-3xl font-bold text-primary max-w-[200px]">
          {activeShift ? "Geofenced Clock-In" : "Clock-In Required"}
        </h3>
      </div>

      <div className="z-10">
        {activeShift ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-on-surface-variant">Clocked in at</p>
              <p className="font-headline text-2xl font-bold text-primary">
                {new Date(activeShift.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <Button
              onClick={handleClockOut}
              variant="danger"
              size="lg"
              disabled={actionLoading}
              className="w-full"
            >
              <span className="material-symbols-outlined mr-2">logout</span>
              {actionLoading ? "Clocking Out..." : "Clock Out"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Button
              onClick={handleClockIn}
              variant="gold"
              size="lg"
              disabled={actionLoading}
              className="w-full"
            >
              <span className="material-symbols-outlined mr-2" style={{ fontVariationSettings: "'FILL' 1" }}>
                fingerprint
              </span>
              {actionLoading ? "Clocking In..." : "Clock-In Now"}
            </Button>
            <p className="text-center text-sm text-on-surface-variant font-body">
              Location verified via GPS
            </p>
          </div>
        )}

        {error && (
          <p className="text-center text-xs text-error mt-2">{error}</p>
        )}
      </div>
    </div>
  )
}
