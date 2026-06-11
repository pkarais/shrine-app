"use client"

import { useState, useTransition } from "react"
import { detectStaffingGaps, type StaffingGap } from "@/lib/actions/staffing-gaps"

const KIND_LABEL: Record<StaffingGap["kind"], string> = {
  schedule_only: "Schedule has coverage, calendar empty",
  calendar_only: "Calendar has events, no one scheduled",
}

const KIND_TONE: Record<StaffingGap["kind"], string> = {
  schedule_only: "bg-tertiary-container text-on-tertiary-container",
  calendar_only: "bg-secondary-container text-on-secondary-container",
}

function formatDate(yyyymmdd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyymmdd)
  if (!m) return yyyymmdd
  return `${m[2]}/${m[3]}`
}

export default function StaffingGapsCard({ initialGaps }: { initialGaps: StaffingGap[] }) {
  const [gaps, setGaps] = useState<StaffingGap[]>(initialGaps)
  const [horizon, setHorizon] = useState<7 | 14 | 30>(14)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const refresh = (days: 7 | 14 | 30) => {
    setHorizon(days)
    setError(null)
    startTransition(async () => {
      try {
        const result = await detectStaffingGaps(days)
        setGaps(result)
      } catch (e: any) {
        setError(e?.message || "Failed to load staffing gaps")
      }
    })
  }

  const scheduleOnly = gaps.filter((g) => g.kind === "schedule_only")
  const calendarOnly = gaps.filter((g) => g.kind === "calendar_only")

  return (
    <section className="card-surface p-6 space-y-4 md:col-span-2">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-widest text-on-surface">Staffing Gaps</h2>
          <p className="text-xs text-on-surface-variant">
            Days where the uploaded schedule and Google Calendar disagree. Open 7 days/week.
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

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface-container p-3">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
            Schedule, no calendar
          </p>
          <p className="text-2xl font-bold text-on-surface mt-1">{scheduleOnly.length}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            Add events to the calendar or mark days closed
          </p>
        </div>
        <div className="rounded-2xl bg-surface-container p-3">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
            Calendar, no schedule
          </p>
          <p className="text-2xl font-bold text-on-surface mt-1">{calendarOnly.length}</p>
          <p className="text-[11px] text-on-surface-variant mt-0.5">
            Re-upload the schedule or assign staff
          </p>
        </div>
      </div>

      {error ? (
        <p className="text-sm text-error">{error}</p>
      ) : gaps.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-4 text-center">
          No gaps detected in the next {horizon} days. Schedule and calendar are in sync.
        </p>
      ) : (
        <div className={"space-y-2 max-h-80 overflow-y-auto pr-1 " + (pending ? "opacity-60" : "")}>
          {gaps.map((g) => (
            <div
              key={g.date + g.kind}
              className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="font-bold text-on-surface">
                    {g.weekday} <span className="text-on-surface-variant font-normal">· {formatDate(g.date)}</span>
                  </p>
                  <span
                    className={
                      "inline-block mt-1 text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-full " +
                      KIND_TONE[g.kind]
                    }
                  >
                    {KIND_LABEL[g.kind]}
                  </span>
                </div>
                {g.severity === "high" && (
                  <span className="text-[10px] font-bold uppercase tracking-widest text-error">High</span>
                )}
              </div>

              {g.scheduled_staff.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                    Scheduled
                  </p>
                  <ul className="text-xs text-on-surface mt-1 space-y-0.5">
                    {g.scheduled_staff.map((s, i) => (
                      <li key={i}>
                        {s.name}
                        {s.start && s.end ? ` · ${s.start}–${s.end}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {g.calendar_events.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                    Calendar events
                  </p>
                  <ul className="text-xs text-on-surface mt-1 space-y-0.5">
                    {g.calendar_events.map((e, i) => (
                      <li key={i}>{e.title}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 flex gap-2">
                <a
                  href={`/calendar/${g.date}`}
                  className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
                >
                  Open day →
                </a>
                {g.kind === "calendar_only" && (
                  <a
                    href="/manager/schedule-upload"
                    className="text-xs font-bold uppercase tracking-wider text-primary hover:underline"
                  >
                    Re-upload schedule →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
