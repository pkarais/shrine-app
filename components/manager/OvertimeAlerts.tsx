import { AlertTriangle, Clock, ShieldCheck } from "lucide-react"

interface Shift {
  id?: string
  clock_in: string
  clock_out?: string | null
  paidHours: number
  isOvertime: boolean
  events?: { title: string } | null
}

export function OvertimeAlerts({ alerts }: { alerts: Shift[] }) {
  if (alerts.length === 0) {
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
      <div className="flex items-center gap-3 text-[var(--tertiary)] mb-6">
        <AlertTriangle className="w-6 h-6" />
        <div>
          <p className="headline-sm text-[var(--on-surface)]">Overtime Alerts</p>
          <p className="body-md">{alerts.length} shift{alerts.length > 1 ? "s" : ""} exceeding 8 hours</p>
        </div>
      </div>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-[var(--surface-container)] rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-[var(--on-surface)]">{alert.events?.title ?? "Unknown Event"}</p>
              <p className="text-xs text-[var(--on-surface-variant)] flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" />
                {new Date(alert.clock_in).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
            <span className="text-[var(--tertiary)] font-display font-bold text-lg">{alert.paidHours.toFixed(1)}h</span>
          </div>
        ))}
      </div>
    </section>
  )
}
