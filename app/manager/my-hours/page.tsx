export const dynamic = "force-dynamic"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { ExportDataButton } from "@/components/manager/ExportDataButton"
import { LocationTypeToggle } from "@/components/manager/LocationTypeToggle"
import { getManagerHoursArchive, getManagerScheduledHours } from "@/lib/actions/manager-hours"
import { getPayPeriod, getPreviousPayPeriod, getNextPayPeriod } from "@/lib/actions/payroll"

type Period = "biweekly" | "monthly"

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}
function monthLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}
function fmtHours(h: number) {
  return h.toFixed(2)
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
function fmtDate(dateKey: string) {
  // dateKey is YYYY-MM-DD in eastern time; render with weekday
  const [y, m, d] = dateKey.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export default async function ManagerMyHoursPage({
  searchParams,
}: {
  searchParams?: { period?: string; date?: string }
}) {
  const supabaseAuth = createServerClient()
  const cookieStore = cookies()
  const hasDevBypass = cookieStore.get("shrine_dev_session")?.value === "true"
  const devRole = cookieStore.get("shrine_dev_role")?.value || "manager"

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  if (!user && !hasDevBypass) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface px-6">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-6xl text-primary mb-4">login</span>
          <h2 className="font-headline text-3xl text-on-surface mb-2">Authentication Required</h2>
          <p className="font-body text-on-surface-variant">Please sign in to view your hours.</p>
        </div>
      </main>
    )
  }

  const admin = createAdminClient()
  const profileRole = user
    ? (await admin.from("profiles").select("role, full_name").eq("id", user.id).single()).data?.role || null
    : hasDevBypass
      ? devRole
      : null

  if (profileRole !== "manager") {
    redirect("/dashboard")
  }

  const period: Period = searchParams?.period === "monthly" ? "monthly" : "biweekly"
  const selectedDateStr = searchParams?.date || new Date().toISOString().split("T")[0]
  const anchor = new Date(selectedDateStr + "T12:00:00")

  let startISO: string
  let endISO: string
  let rangeLabel: string
  let prevDate: string
  let nextDate: string

  if (period === "biweekly") {
    const pp = await getPayPeriod(anchor)
    const prev = await getPreviousPayPeriod(anchor)
    const next = await getNextPayPeriod(anchor)
    startISO = pp.start.toISOString()
    endISO = pp.end.toISOString()
    rangeLabel = pp.label
    prevDate = prev.start.toISOString().split("T")[0]
    nextDate = next.start.toISOString().split("T")[0]
  } else {
    const start = startOfMonth(anchor)
    const end = endOfMonth(anchor)
    startISO = start.toISOString()
    endISO = end.toISOString()
    rangeLabel = monthLabel(anchor)
    const prev = new Date(start)
    prev.setMonth(prev.getMonth() - 1)
    const next = new Date(start)
    next.setMonth(next.getMonth() + 1)
    prevDate = prev.toISOString().split("T")[0]
    nextDate = next.toISOString().split("T")[0]
  }

  const archive = await getManagerHoursArchive(startISO, endISO, rangeLabel)
  const scheduled = await getManagerScheduledHours(startISO, endISO)

  // CSV rows
  const csvRows = archive.shifts.map((s) => ({
    date: fmtDate((s.clock_in.split("T")[0])),
    clock_in: s.clock_in,
    clock_out: s.clock_out ?? "(active)",
    location_type: s.location_type,
    hours: fmtHours(s.hours),
    event_id: s.event_id ?? "",
  }))

  const dailyCsv = archive.byDay.map((d) => ({
    date: d.date,
    onsite_hours: fmtHours(d.onsite),
    offsite_hours: fmtHours(d.offsite),
    total_hours: fmtHours(d.total),
  }))

  return (
    <>
      <TopAppBar showProfile={false} />
      <main className="pt-24 pb-16 px-6 max-w-6xl mx-auto">
        <section className="mb-8">
          <span className="font-label text-xs uppercase tracking-widest text-secondary mb-2 block">
            Manager Portal
          </span>
          <h1 className="font-headline text-5xl font-extrabold text-primary -ml-1">My Hours Archive</h1>
          <p className="font-body text-on-surface-variant mt-2">
            Personal record of on-site (geofenced) and off-site clock-ins.
          </p>
        </section>

        {/* Period selector */}
        <section className="mb-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full border border-outline overflow-hidden">
            <a
              href={`/manager/my-hours?period=biweekly&date=${selectedDateStr}`}
              className={`px-4 py-2 text-sm font-medium ${
                period === "biweekly" ? "bg-primary text-on-primary" : "bg-surface text-on-surface"
              }`}
            >
              Bi-Weekly
            </a>
            <a
              href={`/manager/my-hours?period=monthly&date=${selectedDateStr}`}
              className={`px-4 py-2 text-sm font-medium ${
                period === "monthly" ? "bg-primary text-on-primary" : "bg-surface text-on-surface"
              }`}
            >
              Monthly
            </a>
          </div>

          <div className="inline-flex items-center gap-2">
            <a
              href={`/manager/my-hours?period=${period}&date=${prevDate}`}
              className="btn-secondary px-3 py-1.5 text-sm inline-flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
              Prev
            </a>
            <span className="font-medium text-on-surface px-2">{rangeLabel}</span>
            <a
              href={`/manager/my-hours?period=${period}&date=${nextDate}`}
              className="btn-secondary px-3 py-1.5 text-sm inline-flex items-center gap-1"
            >
              Next
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </a>
          </div>

          <div className="ml-auto flex gap-2">
            <ExportDataButton
              data={dailyCsv}
              filename={`my-hours-daily-${period}-${selectedDateStr}.csv`}
              label="Export Daily CSV"
            />
            <ExportDataButton
              data={csvRows}
              filename={`my-hours-shifts-${period}-${selectedDateStr}.csv`}
              label="Export Shifts CSV"
            />
          </div>
        </section>

        {/* Totals */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-lg border border-outline bg-surface-container p-5">
            <div className="text-xs uppercase tracking-wider text-on-surface-variant mb-1">Scheduled Hours</div>
            <div className="text-4xl font-bold text-secondary">{fmtHours(scheduled.totalHours)}</div>
            <div className="text-xs text-on-surface-variant mt-1">
              From live schedule (snapshot + grid edits)
            </div>
          </div>
          <div className="rounded-lg border border-outline bg-surface-container p-5">
            <div className="text-xs uppercase tracking-wider text-on-surface-variant mb-1">Total Hours (Clocked)</div>
            <div className="text-4xl font-bold text-primary">{fmtHours(archive.totalHours)}</div>
            {archive.activeShiftIncluded && (
              <div className="text-xs text-secondary mt-1">Includes active shift (live)</div>
            )}
          </div>
          <div className="rounded-lg border border-outline bg-surface-container p-5">
            <div className="text-xs uppercase tracking-wider text-on-surface-variant mb-1">On-Site</div>
            <div className="text-4xl font-bold text-on-surface">{fmtHours(archive.onsiteHours)}</div>
            <div className="text-xs text-on-surface-variant mt-1">Geofenced clock-ins</div>
          </div>
          <div className="rounded-lg border border-outline bg-surface-container p-5">
            <div className="text-xs uppercase tracking-wider text-on-surface-variant mb-1">Off-Site</div>
            <div className="text-4xl font-bold text-on-surface">{fmtHours(archive.offsiteHours)}</div>
            <div className="text-xs text-on-surface-variant mt-1">Manager remote clock-ins</div>
          </div>
        </section>

        {/* Daily breakdown */}
        <section className="mb-8">
          <h2 className="text-display-sm text-on-surface mb-4">Daily Breakdown</h2>
          {archive.byDay.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No shifts recorded in this period.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-outline">
              <table className="w-full text-sm">
                <thead className="bg-surface-container text-on-surface-variant">
                  <tr>
                    <th className="text-left px-4 py-2">Date</th>
                    <th className="text-right px-4 py-2">Scheduled</th>
                    <th className="text-right px-4 py-2">On-Site</th>
                    <th className="text-right px-4 py-2">Off-Site</th>
                    <th className="text-right px-4 py-2">Clocked Total</th>
                  </tr>
                </thead>
                <tbody>
                  {archive.byDay.map((d) => (
                    <tr key={d.date} className="border-t border-outline">
                      <td className="px-4 py-2">{fmtDate(d.date)}</td>
                      <td className="px-4 py-2 text-right text-secondary">
                        {fmtHours(scheduled.byDay[d.date] || 0)}
                      </td>
                      <td className="px-4 py-2 text-right">{fmtHours(d.onsite)}</td>
                      <td className="px-4 py-2 text-right">{fmtHours(d.offsite)}</td>
                      <td className="px-4 py-2 text-right font-semibold">{fmtHours(d.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Shift detail */}
        <section className="mb-8">
          <h2 className="text-display-sm text-on-surface mb-4">Shifts ({archive.shifts.length})</h2>
          {archive.shifts.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No shifts recorded.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-outline">
              <table className="w-full text-sm">
                <thead className="bg-surface-container text-on-surface-variant">
                  <tr>
                    <th className="text-left px-4 py-2">Clock In</th>
                    <th className="text-left px-4 py-2">Clock Out</th>
                    <th className="text-left px-4 py-2">Location</th>
                    <th className="text-right px-4 py-2">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {archive.shifts.map((s) => (
                    <tr key={s.id} className="border-t border-outline">
                      <td className="px-4 py-2">{fmtTime(s.clock_in)}</td>
                      <td className="px-4 py-2">
                        {s.clock_out ? (
                          fmtTime(s.clock_out)
                        ) : (
                          <span className="text-secondary font-medium">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <LocationTypeToggle shiftId={s.id} current={s.location_type} />
                      </td>
                      <td className="px-4 py-2 text-right font-medium">{fmtHours(s.hours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </>
  )
}
