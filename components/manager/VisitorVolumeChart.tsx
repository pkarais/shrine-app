"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { createClient } from "@/utils/supabase/client"
import { clearVisitorVolume } from "@/lib/actions/visitor-volume"

type VolumePoint = {
  hour: string
  visitors: number
  height: number
  isCritical?: boolean
}

type VisitorRow = {
  count: number
  recorded_at: string
}

function toChartData(rows: VisitorRow[]): VolumePoint[] {
  const sorted = [...rows]
    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
    .slice(-7)

  const max = sorted.length > 0 ? Math.max(...sorted.map((r) => r.count || 0), 1) : 1

  return sorted.map((row) => {
    const pct = Math.max(20, Math.round(((row.count || 0) / max) * 90))
    return {
      hour: new Date(row.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      visitors: row.count || 0,
      height: pct,
      isCritical: (row.count || 0) >= max * 0.85,
    }
  })
}

export function VisitorVolumeChart({ initialRows }: { initialRows: VisitorRow[] }) {
  const supabase = useMemo(() => createClient(), [])
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [rows, setRows] = useState<VisitorRow[]>(initialRows || [])
  const [confirmingReset, setConfirmingReset] = useState(false)
  const [pendingReset, startReset] = useTransition()

  function handleReset() {
    setConfirmingReset(false)
    startReset(async () => {
      try {
        await clearVisitorVolume()
        setRows([])
      } catch (err: any) {
        alert(err?.message || "Failed to clear visitor volume.")
      }
    })
  }

  useEffect(() => {
    setRows(initialRows || [])
  }, [initialRows])

  useEffect(() => {
    const channel = supabase
      .channel("manager-visitor-volume")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "visitor_volume" },
        (payload: any) => {
          const row = payload?.new
          if (!row?.recorded_at) return
          setRows((prev) => [...prev, { count: Number(row.count || 0), recorded_at: row.recorded_at }].slice(-30))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const data = toChartData(rows)

  return (
    <div className="md:col-span-2 lg:col-span-3 bg-surface-container-low rounded-xl p-8 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-headline font-bold text-xl">Visitor Volume vs. Staffing</h3>
          <p className="text-on-surface-variant text-sm">Real-time occupancy tracking across sectors</p>
        </div>
        <span className="bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-full text-xs font-bold font-label tracking-wider uppercase">
          Live Tracking
        </span>
      </div>

      <div className="flex justify-end gap-2">
        {confirmingReset ? (
          <>
            <button
              onClick={handleReset}
              disabled={pendingReset}
              className="btn-danger px-3 py-1.5 text-xs disabled:opacity-50"
            >
              {pendingReset ? "Clearing…" : `Confirm clear ${rows.length}`}
            </button>
            <button
              onClick={() => setConfirmingReset(false)}
              disabled={pendingReset}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmingReset(true)}
            disabled={rows.length === 0 || pendingReset}
            className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-50"
            title="Delete all visitor counts so the chart starts fresh"
          >
            Reset chart
          </button>
        )}
      </div>

      <div className="h-64 flex items-end gap-2 pt-10">
        {data.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-sm text-on-surface-variant">
            No visitor telemetry available.
          </div>
        ) : data.map((item, i) => (
          <div
            key={i}
            className={`flex-1 rounded-t-lg relative group transition-all ${
              item.isCritical
                ? "bg-tertiary-container/30 border-t-2 border-tertiary hover:bg-tertiary-container/50"
                : "bg-surface-container-highest hover:bg-primary-container/20"
            }`}
            style={{ height: `${item.height}%` }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {/* Always-visible count above the bar (never hidden behind the
                Peak badge — that label now lives only in the footer row). */}
            <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-bold whitespace-nowrap ${
              item.isCritical ? "text-tertiary" : "text-on-surface"
            }`}>
              {item.visitors}
            </div>
            {hoveredIndex === i && (
              <div className={`absolute -top-12 left-1/2 -translate-x-1/2 text-[10px] px-2 py-1 rounded whitespace-nowrap ${
                item.isCritical ? "bg-tertiary text-white" : "bg-inverse-surface text-inverse-on-surface"
              }`}>
                {item.visitors} @ {item.hour}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between text-xs text-on-surface-variant font-label uppercase tracking-widest pt-2">
        {data.map((item, i) => (
          <span key={i} className={item.isCritical ? "text-tertiary font-bold" : ""}>
            {item.isCritical ? `${item.hour} (Peak)` : item.hour}
          </span>
        ))}
      </div>
    </div>
  )
}
