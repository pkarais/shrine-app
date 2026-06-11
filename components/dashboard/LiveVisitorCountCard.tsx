"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { submitVisitorCount } from "@/lib/actions/visitor-volume"

export function LiveVisitorCountCard({
  eventId,
  canUpdate = true,
}: {
  eventId?: number | null
  canUpdate?: boolean
}) {
  const supabase = useMemo(() => createClient(), [])
  const [currentCount, setCurrentCount] = useState<number>(0)
  const [draftCount, setDraftCount] = useState<string>("0")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const loadLatest = useCallback(async () => {
    // Use Eastern Time midnight so "today" matches the ET wall calendar,
    // not UTC midnight which is 4-5 hours behind NYC.
    const todayEt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date())
    // Generous window: ET midnight expressed as a UTC ISO string
    const dayStart = new Date(`${todayEt}T00:00:00-05:00`).toISOString()

    let query = supabase
      .from("visitor_volume")
      .select("count, recorded_at, event_id")
      .gte("recorded_at", dayStart)
      .order("recorded_at", { ascending: false })
      .limit(1)

    if (eventId) {
      query = query.eq("event_id", eventId)
    }

    const { data } = await query
    const latest = data?.[0]
    if (latest) {
      setCurrentCount(latest.count || 0)
      setDraftCount(String(latest.count || 0))
      setLastUpdated(latest.recorded_at || null)
    }
  }, [eventId, supabase])

  useEffect(() => {
    const setup = async () => {
      await loadLatest()
    }

    setup()

    // Listen for both INSERT (first entry of the day) and UPDATE (subsequent
    // snapshots — now that submitVisitorCount upserts instead of always inserting)
    const handleRow = (payload: any) => {
      const row = payload?.new
      if (!row) return
      if (eventId && Number(row.event_id) !== Number(eventId)) return
      setCurrentCount(Number(row.count || 0))
      setDraftCount(String(Number(row.count || 0)))
      setLastUpdated(row.recorded_at || null)
    }

    const channel = supabase
      .channel(`visitor-volume-live-${eventId ?? "global"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "visitor_volume" }, handleRow)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "visitor_volume" }, handleRow)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId, supabase, loadLatest])

  const pushCount = async (nextCount: number) => {
    setError(null)
    if (nextCount < 0) {
      setError("Count cannot be negative.")
      return
    }

    setSaving(true)
    try {
      const result = await submitVisitorCount(eventId || null, nextCount)

      // Reflect successful writes immediately even if Realtime delivery is delayed.
      const saved = result?.row
      if (saved) {
        const savedCount = Number(saved.count || 0)
        setCurrentCount(savedCount)
        setDraftCount(String(savedCount))
        setLastUpdated(saved.recorded_at || new Date().toISOString())
      }

      await loadLatest()
    } catch (err: any) {
      setSaving(false)
      setError(err?.message || "Failed to update visitor count.")
      return
    }
    setSaving(false)
  }

  const parsedDraft = Number(draftCount)

  return (
    <section className="card-surface p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-2">Door Telemetry</p>
          <h3 className="font-headline text-2xl font-bold text-primary">Live Visitor Count</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            {canUpdate
              ? "Shared across on-duty security staff and manager view."
              : "Live running tally for current operations visibility."}
          </p>
        </div>
        <span className="badge-task">Live</span>
      </div>

      <div className="flex items-end gap-4">
        <div className="text-5xl font-headline font-extrabold text-primary leading-none">{currentCount}</div>
        <div className="text-xs text-on-surface-variant pb-1">
          {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "No updates yet"}
        </div>
      </div>

      {canUpdate ? (
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-end">
          <div>
            <label className="block text-xs uppercase tracking-widest text-on-surface-variant mb-2">Set Current Count</label>
            <input
              type="number"
              min={0}
              value={draftCount}
              onChange={(e) => setDraftCount(e.target.value)}
              className="w-full input-surface px-4 py-3"
            />
          </div>
          <button
            onClick={() => pushCount(Number.isFinite(parsedDraft) ? parsedDraft : currentCount)}
            disabled={saving}
            className="btn-primary px-4 py-3 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Update"}
          </button>
          <button
            onClick={() => pushCount(currentCount + 1)}
            disabled={saving}
            className="btn-secondary px-4 py-3 disabled:opacity-50"
          >
            +1
          </button>
        </div>
      ) : null}
      {error ? <p className="text-xs text-error">{error}</p> : null}
    </section>
  )
}
