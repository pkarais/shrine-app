export const dynamic = 'force-dynamic'

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { ExportDataButton } from "@/components/manager/ExportDataButton"
// Types inferred from Supabase queries

function getStartOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
}

function getStartOfLastMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
}

function getHoursBetween(start: string, end: string | null) {
  if (!end) return 0
  return (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
}

export default async function ManagerReportsPage() {
  const supabase = createServerClient()
  const cookieStore = cookies()
  const hasDevBypass = cookieStore.get("shrine_dev_session")?.value === "true"
  const devRole = cookieStore.get("shrine_dev_role")?.value || ""

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !hasDevBypass) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface px-6">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-6xl text-primary mb-4">login</span>
          <h2 className="font-headline text-3xl text-on-surface mb-2">Authentication Required</h2>
          <p className="font-body text-on-surface-variant">Please sign in to access reports.</p>
        </div>
      </main>
    )
  }

  const profileRole = user
    ? (await createAdminClient().from("profiles").select("role").eq("id", user.id).single()).data?.role || null
    : hasDevBypass
      ? devRole
      : null

  if (profileRole !== "manager") {
    redirect("/dashboard")
  }

  const admin = createAdminClient()
  const startOfMonth = getStartOfMonth()
  const startOfLastMonth = getStartOfLastMonth()

  const [
    { data: shifts },
    { data: incidents },
    { data: walkthroughs },
    { data: tickets },
    { data: visitorVolume },
    { data: profiles },
  ] = await Promise.all([
    admin.from("shifts").select("id, user_id, event_id, clock_in, clock_out, created_at").gte("clock_in", startOfLastMonth).order("clock_in", { ascending: false }).limit(200),
    admin.from("incidents").select("id, user_id, severity, description, location, shift, created_at").order("created_at", { ascending: false }).limit(200),
    admin.from("walkthroughs").select("id, user_id, walkthrough_type, category, completed_at").order("completed_at", { ascending: false }).limit(100),
    admin.from("tickets").select("id, user_id, title, description, priority, status, created_at, resolved_at").order("created_at", { ascending: false }).limit(200),
    admin.from("visitor_volume").select("id, count, recorded_at").order("recorded_at", { ascending: false }).limit(30),
    admin.from("profiles").select("id, full_name, email, role"),
  ])

  const shiftList: any[] = shifts || []
  const incidentList: any[] = incidents || []
  const walkthroughList: any[] = walkthroughs || []
  const ticketList: any[] = tickets || []
  const visitorList: any[] = visitorVolume || []
  const profileList: any[] = profiles || []

  const profileMap = new Map(profileList.map((p) => [p.id, p]))

  // Metrics
  const thisMonthShifts = shiftList.filter((s) => s.clock_in >= startOfMonth)
  const totalShiftsThisMonth = thisMonthShifts.length
  const totalIncidents = incidentList.length

  const staffHoursMap = new Map<string, number>()
  let overtimeCount = 0
  shiftList.forEach((s) => {
    const hours = getHoursBetween(s.clock_in, s.clock_out)
    if (hours > 8) overtimeCount++
    staffHoursMap.set(s.user_id, (staffHoursMap.get(s.user_id) || 0) + hours)
  })

  const uniqueStaffCount = staffHoursMap.size || 1
  const totalHours = Array.from(staffHoursMap.values()).reduce((a, b) => a + b, 0)
  const avgHoursPerStaff = totalHours / uniqueStaffCount

  const openTickets = ticketList.filter((t) => t.status === "open").length

  // Visitor trend (last 7 days vs previous 7 days)
  const now = Date.now()
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000

  const recentVisitors = visitorList.filter((v) => new Date(v.recorded_at).getTime() >= sevenDaysAgo)
  const previousVisitors = visitorList.filter((v) => {
    const t = new Date(v.recorded_at).getTime()
    return t >= fourteenDaysAgo && t < sevenDaysAgo
  })

  const recentVisitorTotal = recentVisitors.reduce((sum, v) => sum + (v.count || 0), 0)
  const previousVisitorTotal = previousVisitors.reduce((sum, v) => sum + (v.count || 0), 0)
  const visitorTrend = previousVisitorTotal === 0 ? 0 : ((recentVisitorTotal - previousVisitorTotal) / previousVisitorTotal) * 100

  // Recent shifts with hours (last 20)
  const recentShifts = shiftList.slice(0, 20).map((s) => {
    const hours = getHoursBetween(s.clock_in, s.clock_out)
    const profile = profileMap.get(s.user_id)
    return {
      id: s.id,
      name: profile?.full_name || profile?.email || s.user_id.slice(0, 8),
      role: profile?.role || "",
      date: formatDate(s.clock_in),
      clockIn: formatTime(s.clock_in),
      clockOut: s.clock_out ? formatTime(s.clock_out) : "—",
      hours: hours.toFixed(1),
      isOvertime: hours > 8,
    }
  })

  // Incident breakdown by severity
  const severityCounts: Record<string, number> = {}
  incidentList.forEach((i) => {
    const sev = i.severity || "unknown"
    severityCounts[sev] = (severityCounts[sev] || 0) + 1
  })

  const severityOrder = ["critical", "high", "medium", "low", "unknown"]
  const severityBreakdown = severityOrder
    .filter((s) => severityCounts[s])
    .map((s) => ({ severity: s, count: severityCounts[s] }))

  // Staff utilization data (top 15 by hours)
  const staffUtilization = Array.from(staffHoursMap.entries())
    .map(([userId, hours]) => {
      const profile = profileMap.get(userId)
      return {
        userId,
        name: profile?.full_name || profile?.email || userId.slice(0, 8),
        role: profile?.role || "",
        hours,
      }
    })
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 15)

  const maxUtilizationHours = Math.max(...staffUtilization.map((s) => s.hours), 1)

  // Export data arrays
  const shiftsExport = recentShifts.map((s) => ({
    Name: s.name,
    Role: s.role,
    Date: s.date,
    "Clock In": s.clockIn,
    "Clock Out": s.clockOut,
    Hours: s.hours,
    Overtime: s.isOvertime ? "Yes" : "No",
  }))

  const incidentsExport = incidentList.map((i) => ({
    Severity: i.severity,
    Description: i.description,
    Location: i.location,
    Shift: i.shift,
    Date: formatDate(i.created_at),
  }))

  const staffUtilExport = staffUtilization.map((s) => ({
    Name: s.name,
    Role: s.role,
    Hours: s.hours.toFixed(1),
  }))

  const severityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-900/30 text-red-400"
      case "high": return "bg-orange-900/30 text-orange-400"
      case "medium": return "bg-yellow-900/30 text-yellow-400"
      case "low": return "bg-blue-900/30 text-blue-400"
      default: return "bg-surface-container-high text-on-surface-variant"
    }
  }

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case "manager": return "bg-[var(--secondary-container)] text-[var(--secondary)]"
      case "operations": return "bg-[var(--primary-fixed)] text-[var(--primary)]"
      case "security": return "bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]"
      default: return "bg-[var(--surface-container)] text-[var(--on-surface-variant)]"
    }
  }

  return (
    <>
      <TopAppBar />
      <main className="pt-24 pb-16 px-6 max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <section>
          <p className="font-label text-xs uppercase tracking-[0.05em] text-on-surface-variant mb-1">Sacred Blueprint / Operations</p>
          <h1 className="text-display-md text-on-surface">Manager Analytics & Reports</h1>
        </section>

        {/* Analytics Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-surface-container-low rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary">schedule</span>
              <span className="text-xs label-text font-semibold">Shifts This Month</span>
            </div>
            <p className="text-display-md text-on-surface">{totalShiftsThisMonth}</p>
            <p className="text-xs text-on-surface-variant">{thisMonthShifts.filter((s) => !s.clock_out).length} currently active</p>
          </div>

          <div className="bg-surface-container-low rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-tertiary">report</span>
              <span className="text-xs label-text font-semibold">Total Incidents</span>
            </div>
            <p className="text-display-md text-on-surface">{totalIncidents}</p>
            <p className="text-xs text-on-surface-variant">{incidentList.filter((i) => i.severity === "critical" || i.severity === "high").length} high severity</p>
          </div>

          <div className="bg-surface-container-low rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary">timer</span>
              <span className="text-xs label-text font-semibold">Avg Hours / Staff</span>
            </div>
            <p className="text-display-md text-on-surface">{avgHoursPerStaff.toFixed(1)}h</p>
            <p className="text-xs text-on-surface-variant">Across {uniqueStaffCount} staff members</p>
          </div>

          <div className="bg-surface-container-low rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-error">warning</span>
              <span className="text-xs label-text font-semibold">Overtime Count</span>
            </div>
            <p className="text-display-md text-on-surface">{overtimeCount}</p>
            <p className="text-xs text-on-surface-variant">Shifts exceeding 8 hours</p>
          </div>

          <div className="bg-surface-container-low rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-secondary">confirmation_number</span>
              <span className="text-xs label-text font-semibold">Open Tickets</span>
            </div>
            <p className="text-display-md text-on-surface">{openTickets}</p>
            <p className="text-xs text-on-surface-variant">{ticketList.filter((t) => t.status === "in_progress").length} in progress</p>
          </div>

          <div className="bg-surface-container-low rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-primary">groups</span>
              <span className="text-xs label-text font-semibold">Visitor Trend (7d)</span>
            </div>
            <p className={`text-display-md ${visitorTrend >= 0 ? "text-on-surface" : "text-error"}`}>
              {visitorTrend >= 0 ? "+" : ""}{visitorTrend.toFixed(1)}%
            </p>
            <p className="text-xs text-on-surface-variant">{recentVisitorTotal} recent visitors</p>
          </div>
        </section>

        {/* Recent Shifts Table */}
        <section className="bg-surface-container-low rounded-2xl p-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs label-text text-on-surface-variant mb-1">Workforce</p>
              <h2 className="text-display-sm text-on-surface">Recent Shifts with Hours</h2>
            </div>
            <ExportDataButton
              data={shiftsExport}
              filename={`shifts-report-${new Date().toISOString().slice(0, 10)}.csv`}
              label="Export Shifts"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/20">
                  <th className="pb-3 text-xs label-text text-on-surface-variant font-semibold">Staff</th>
                  <th className="pb-3 text-xs label-text text-on-surface-variant font-semibold">Date</th>
                  <th className="pb-3 text-xs label-text text-on-surface-variant font-semibold">Clock In</th>
                  <th className="pb-3 text-xs label-text text-on-surface-variant font-semibold">Clock Out</th>
                  <th className="pb-3 text-xs label-text text-on-surface-variant font-semibold text-right">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {recentShifts.map((s) => (
                  <tr key={s.id} className="group">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-container text-white text-xs font-bold flex items-center justify-center">
                          {s.name[0]?.toUpperCase() || "S"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-on-surface">{s.name}</p>
                          {s.role && (
                            <span className={`text-[10px] label-text font-semibold px-1.5 py-0.5 rounded-full ${roleBadgeColor(s.role)}`}>
                              {s.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-sm text-on-surface">{s.date}</td>
                    <td className="py-3 text-sm text-on-surface">{s.clockIn}</td>
                    <td className="py-3 text-sm text-on-surface">{s.clockOut}</td>
                    <td className="py-3 text-sm font-bold text-right">
                      <span className={s.isOvertime ? "text-error" : "text-primary"}>{s.hours}h</span>
                      {s.isOvertime && <span className="ml-1 text-[10px] label-text text-error">OT</span>}
                    </td>
                  </tr>
                ))}
                {recentShifts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-sm text-on-surface-variant">No shift data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Incident Breakdown + Staff Utilization */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Incident Breakdown */}
          <div className="bg-surface-container-low rounded-2xl p-8 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs label-text text-on-surface-variant mb-1">Safety</p>
                <h2 className="text-display-sm text-on-surface">Incident Breakdown</h2>
              </div>
              <ExportDataButton
                data={incidentsExport}
                filename={`incidents-report-${new Date().toISOString().slice(0, 10)}.csv`}
                label="Export Incidents"
              />
            </div>

            <div className="space-y-3">
              {severityBreakdown.map((item) => (
                <div key={item.severity} className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${severityColor(item.severity)}`}>
                      {item.severity}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-2 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min((item.count / totalIncidents) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-on-surface w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
              {severityBreakdown.length === 0 && (
                <div className="text-center py-12 text-sm text-on-surface-variant">No incidents on file</div>
              )}
            </div>
          </div>

          {/* Staff Utilization Chart */}
          <div className="bg-surface-container-low rounded-2xl p-8 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs label-text text-on-surface-variant mb-1">Productivity</p>
                <h2 className="text-display-sm text-on-surface">Staff Utilization</h2>
              </div>
              <ExportDataButton
                data={staffUtilExport}
                filename={`staff-utilization-${new Date().toISOString().slice(0, 10)}.csv`}
                label="Export Utilization"
              />
            </div>

            <div className="space-y-4">
              {staffUtilization.map((s) => {
                const pct = (s.hours / maxUtilizationHours) * 100
                return (
                  <div key={s.userId} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-on-surface">{s.name}</span>
                        {s.role && (
                          <span className={`text-[10px] label-text font-semibold px-1.5 py-0.5 rounded-full ${roleBadgeColor(s.role)}`}>
                            {s.role}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-on-surface">{s.hours.toFixed(1)}h</span>
                    </div>
                    <div className="h-3 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full sacred-gradient transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {staffUtilization.length === 0 && (
                <div className="text-center py-12 text-sm text-on-surface-variant">No utilization data available</div>
              )}
            </div>
          </div>
        </section>

        {/* Walkthroughs & Tickets Summary */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-surface-container-low rounded-2xl p-8 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs label-text text-on-surface-variant mb-1">Inspections</p>
                <h2 className="text-display-sm text-on-surface">Recent Walkthroughs</h2>
              </div>
              <ExportDataButton
                data={walkthroughList.map((w) => ({
                  Type: w.walkthrough_type,
                  Category: w.category,
                  Completed: formatDate(w.completed_at),
                }))}
                filename={`walkthroughs-${new Date().toISOString().slice(0, 10)}.csv`}
                label="Export Walkthroughs"
              />
            </div>

            <div className="space-y-3">
              {walkthroughList.slice(0, 10).map((w) => {
                const profile = profileMap.get(w.user_id)
                return (
                  <div key={w.id} className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-container text-white text-xs font-bold flex items-center justify-center">
                        {(profile?.full_name?.[0] || "W").toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">{profile?.full_name || profile?.email || w.user_id.slice(0, 8)}</p>
                        <p className="text-xs text-on-surface-variant capitalize">{w.walkthrough_type} · {w.category}</p>
                      </div>
                    </div>
                    <span className="text-xs text-on-surface-variant">{formatDate(w.completed_at)}</span>
                  </div>
                )
              })}
              {walkthroughList.length === 0 && (
                <div className="text-center py-12 text-sm text-on-surface-variant">No walkthroughs recorded</div>
              )}
            </div>
          </div>

          <div className="bg-surface-container-low rounded-2xl p-8 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs label-text text-on-surface-variant mb-1">Maintenance</p>
                <h2 className="text-display-sm text-on-surface">Recent Tickets</h2>
              </div>
              <ExportDataButton
                data={ticketList.slice(0, 50).map((t) => ({
                  Title: t.title,
                  Status: t.status,
                  Priority: t.priority,
                  Created: formatDate(t.created_at),
                }))}
                filename={`tickets-${new Date().toISOString().slice(0, 10)}.csv`}
                label="Export Tickets"
              />
            </div>

            <div className="space-y-3">
              {ticketList.slice(0, 10).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-surface-container rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{t.title}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{t.description?.slice(0, 80) || "No description"}{t.description && t.description.length > 80 ? "..." : ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] label-text font-semibold px-2 py-0.5 rounded-full ${
                      t.status === "open" ? "bg-error-container text-error" :
                      t.status === "in_progress" ? "bg-secondary-container text-secondary" :
                      "bg-primary-fixed text-primary"
                    }`}>
                      {t.status}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">{t.priority}</span>
                  </div>
                </div>
              ))}
              {ticketList.length === 0 && (
                <div className="text-center py-12 text-sm text-on-surface-variant">No tickets on file</div>
              )}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
