"use client"

import { useState } from "react"
import { AlertTriangle, Clock, ShieldCheck, X, Trash2 } from "lucide-react"

interface Shift {
  id?: string
  user_id?: string
  clock_in: string
  clock_out?: string | null
  paidHours: number
  isOvertime: boolean
  /** Joined profile row — present when manager page maps shiftsWithProfiles */
  profiles?: { full_name?: string | null; role?: string | null } | null
  /** Legacy FK join field — kept for back-compat but usually null */
  events?: { title: string } | null
}

export function OvertimeAlerts({ alerts }: { alerts: Shift[] }) {
  // Dismissed set is stored in local state so the manager can ack rows
  // without a full page reload. IDs fall back to clock_in timestamp so
  // shifts without a DB id can still be dismissed.
  const keyOf = (a: Shift) => a.id ?? a.clock_in

  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  const dismiss = (key: string) =>
    setDismissed((prev) => { const next = new Set(prev); next.add(key); return next })

  const dismissAll = () => {
    const all = new Set<string>()
    visible.forEach((a) => all.add(keyOf(a)))
    setDismissed(all)
  }

  const visible = alerts.filter((a) => !dismissed.has(keyOf(a)))

  if (visible.length === 0) {
    return (
      <section className="card-surface p-8">
        <div className="flex items-center gap-3 text-[var(--secondary)]">
          <ShieldCheck className="w-6 h-6" />
          <div>
            <p className="headline-sm text-[var(--on-surface)]">All Clear</p>
            <p className="body-md mt-1">All shifts are within normal hours.</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="card-surface p-8">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 text-[var(--tertiary)]">
          <AlertTriangle className="w-6 h-6" />
          <div>
            <p className="headline-sm text-[var(--on-surface)]">Overtime Alerts</p>
            <p className="body-md">
              {visible.length} shift{visible.length > 1 ? "s" : ""} exceeding{" "}
              {alerts[0] ? `${Math.floor(alerts[0].paidHours >= 8 ? 8 : 7.5)}h` : "threshold"}
            </p>
          </div>
        </div>

        {/* Clear all button */}
        <button
          onClick={dismissAll}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
                     bg-[var(--surface-container)] text-[var(--on-surface-variant)]
                     hover:bg-[var(--surface-container-high)] transition-colors"
          title="Dismiss all overtime alerts"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear all
        </button>
      </div>

      <div className="space-y-3">
        {visible.map((alert) => {
          const key = keyOf(alert)

          // Prefer the joined profile name; fall back to event title then "Unknown Staff"
          const staffName =
            alert.profiles?.full_name ??
            alert.events?.title ??
            "Unknown Staff"

          const role = alert.profiles?.role ?? null

          const dateLabel = new Date(alert.clock_in).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "America/New_York",
          })

          const hoursColor =
            alert.paidHours >= 12
              ? "text-red-600 dark:text-red-400"
              : "text-[var(--tertiary)]"

          return (
            <div
              key={key}
              className="bg-[var(--surface-container)] rounded-lg p-4 flex items-center justify-between gap-3"
            >
              {/* Left: name + meta */}
              <div className="min-w-0">
                <p className="font-semibold text-[var(--on-surface)] truncate">
                  {staffName}
                </p>
                {role && (
                  <p className="text-xs text-[var(--on-surface-variant)] capitalize mt-0.5">
                    {role}
                  </p>
                )}
                <p className="text-xs text-[var(--on-surface-variant)] flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 shrink-0" />
                  {dateLabel}
                </p>
              </div>

              {/* Right: hours + dismiss */}
              <div className="flex items-center gap-3 shrink-0">
                <span className={`font-display font-bold text-lg ${hoursColor}`}>
                  {alert.paidHours.toFixed(1)}h
                </span>
                <button
                  onClick={() => dismiss(key)}
                  className="p-1 rounded-md text-[var(--on-surface-variant)]
                             hover:bg-[var(--surface-container-high)] transition-colors"
                  title="Dismiss this alert"
                  aria-label={`Dismiss overtime alert for ${staffName}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
