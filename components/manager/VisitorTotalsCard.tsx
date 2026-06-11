"use client"

import { useEffect, useState, useTransition } from "react"
import { getVisitorTotals, type RollupScope, type VisitorRollup } from "@/lib/actions/visitor-rollups"

const SCOPES: { key: RollupScope; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "biweek", label: "Bi-week" },
  { key: "month", label: "Month" },
]

function formatHour(h: number): string {
  const suffix = h >= 12 ? "PM" : "AM"
  const display = h % 12 === 0 ? 12 : h % 12
  return `${display}${suffix}`
}

function formatDayLabel(yyyymmdd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd)
  if (!m) return yyyymmdd
  return `${m[2]}/${m[3]}`
}

export default function VisitorTotalsCard({ initial }: { initial: VisitorRollup | null }) {
  const [scope, setScope] = useState<RollupScope>("today")
  const [rollup, setRollup] = useState<VisitorRollup | null>(initial)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (scope === "today" && initial && rollup?.scope === "today") return
    setError(null)
    startTransition(async () => {
      try {
        const result = await getVisitorTotals(scope)
        setRollup(result)
      } catch (e: any) {
        setError(e?.message || "Failed to load visitor totals")
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope])

  return (
    <section className="card-surface p-6 space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-widest text-on-surface">Visitor Totals</h2>
          <p className="text-xs text-on-surface-variant">
            Aggregated end-of-period counts. Rolls into daily briefs and the bi-weekly payroll report.
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-surface-container p-1">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setScope(s.key)}
              className={
                "px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition " +
                (scope === s.key
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:bg-surface-container-high")
              }
            >
              {s.label}
            </button>
          ))}
        </div>
      </header>

      {error ? (
        <p className="text-sm text-error">{error}</p>
      ) : !rollup ? (
        <p className="text-sm text-on-surface-variant">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Total" value={rollup.total.toLocaleString()} sub={rollup.label} pending={pending} />
            <Tile
              label="Avg / day"
              value={rollup.averagePerDay.toLocaleString()}
              sub={`${rollup.daysWithData}/${rollup.days} days`}
              pending={pending}
            />
            <Tile
              label="Peak day"
              value={rollup.peakDay ? rollup.peakDay.count.toLocaleString() : "—"}
              sub={rollup.peakDay ? formatDayLabel(rollup.peakDay.date) : "no data"}
              pending={pending}
            />
            <Tile
              label="Peak hour"
              value={rollup.peakHour ? rollup.peakHour.count.toLocaleString() : "—"}
              sub={rollup.peakHour ? `${formatHour(rollup.peakHour.hour)} ET` : "no data"}
              pending={pending}
            />
          </div>

          {rollup.byDay.length > 1 && (
            <div className="pt-2">
              <p className="text-[11px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">
                Day-by-day ({rollup.start} → {rollup.end})
              </p>
              <div className="flex items-end gap-1 h-24">
                {rollup.byDay.map((d) => {
                  const max = Math.max(1, ...rollup.byDay.map((x) => x.total))
                  const heightPct = (d.total / max) * 100
                  const isPeak = rollup.peakDay?.date === d.date && d.total > 0
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1" title={`${d.date}: ${d.total}`}>
                      <div className="w-full bg-surface-container-high rounded-t flex items-end" style={{ height: "100%" }}>
                        <div
                          className={"w-full rounded-t " + (isPeak ? "bg-tertiary" : "bg-primary")}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-on-surface-variant whitespace-nowrap">
                        {formatDayLabel(d.date)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <p className="text-[11px] text-on-surface-variant pt-1">
            Totals use Eastern Time day boundaries. The chart Reset button archives today&apos;s final snapshot
            then clears only today&apos;s live rows. Historical data is preserved for week / bi-week / month rollups.
          </p>
        </>
      )}
    </section>
  )
}

function Tile({ label, value, sub, pending }: { label: string; value: string; sub: string; pending: boolean }) {
  return (
    <div className={"rounded-2xl bg-surface-container p-3 " + (pending ? "opacity-60" : "")}>
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">{label}</p>
      <p className="text-2xl font-bold text-on-surface mt-1">{value}</p>
      <p className="text-[11px] text-on-surface-variant mt-0.5">{sub}</p>
    </div>
  )
}
