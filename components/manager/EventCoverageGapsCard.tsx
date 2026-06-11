"use client"

import { useState, useTransition } from "react"
import { getEventCoverageGaps, type EventCoverageRow } from "@/lib/actions/event-coverage"

const ROLE_LABEL: Record<string, string> = {
  operations: "Ops",
  security: "Security",
  greeter: "Greeter",
  director: "Director",
}

function fmtDate(yyyymmdd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd)
  if (!m) return yyyymmdd
  return `${m[2]}/${m[3]}`
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso))
}

export default function EventCoverageGapsCard({
  initialGaps,
}: {
  initialGaps: EventCoverageRow[]
}) {
  const [gaps, setGaps] = useState<EventCoverageRow[]>(initialGaps)
  const [horizon, setHorizon] = useState<7 | 14 | 30>(14)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const refresh = (days: 7 | 14 | 30) => {
    setHorizon(days)
    setError(null)
    startTransition(async () => {
      try {
        const result = await getEventCoverageGaps(days)
        setGaps(result)
      } catch (e: any) {
        setError(e?.message || "Failed to load event coverage")
      }
    })
  }

  return (
    <section className="card-surface p-6 space-y-4 md:col-span-2">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-widest text-on-surface">
            Event Coverage Gaps
          </h2>
          <p className="text-xs text-on-surface-variant">
            Events whose required roles are not covered by the uploaded
            schedule. Shifts come from the bi-weekly upload — assignments
            here are coverage links, not new shifts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-full bg-surface-container p-1">
            {([7, 14, 30] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => refresh(d)}
                className={
                  "px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full transition " +
                  (horizon === d
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-variant hover:bg-surface-container-high")
                }
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="rounded-2xl bg-surface-container p-3">
        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
          Uncovered events in next {horizon}d
        </p>
        <p className="text-2xl font-bold text-on-surface mt-1">{gaps.length}</p>
        <p className="text-[11px] text-on-surface-variant mt-0.5">
          Either extend a scheduled shift, add coverage, or downgrade requirements.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-error">{error}</p>
      ) : gaps.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-4 text-center">
          Every event in the next {horizon} days is covered by the schedule.
        </p>
      ) : (
        <div className={"space-y-2 max-h-80 overflow-y-auto pr-1 " + (pending ? "opacity-60" : "")}>
          {gaps.map((row) => (
            <div
              key={row.eventId}
              className="rounded-xl border border-error/30 bg-error-container/20 p-3"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-bold text-on-surface truncate">{row.title}</p>
                  <p className="text-xs text-on-surface-variant">
                    {fmtDate(row.date)} · {fmtTime(row.startTime)}
                    {row.endTime ? ` – ${fmtTime(row.endTime)}` : ""}
                  </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-error">
                  Uncovered
                </span>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {row.coverage.gaps.map((g) => (
                  <span
                    key={g.role}
                    className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full bg-error-container text-on-error-container"
                  >
                    {ROLE_LABEL[g.role] || g.role}: {g.have}/{g.needed}
                  </span>
                ))}
              </div>

              {row.coverage.contributors.length > 0 && (
                <p className="mt-2 text-[11px] text-on-surface-variant">
                  On schedule during event:{" "}
                  {row.coverage.contributors
                    .filter((c) => c.source === "schedule")
                    .map((c) => `${c.name} (${ROLE_LABEL[c.role] || c.role})`)
                    .join(", ") || "none"}
                </p>
              )}

              <div className="mt-2">
                <a
                  href={`/calendar/${row.date}`}
                  className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
                >
                  Open day →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
