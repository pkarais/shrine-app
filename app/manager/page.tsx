import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { ManagerTicketCommand } from "@/components/shared/ManagerTicketCommand"
import { cookies } from "next/headers"
import Image from "next/image"
import { VisitorVolumeChart } from "@/components/manager/VisitorVolumeChart"
import { MediaFolders } from "@/components/manager/MediaFolders"
import { DirectComms } from "@/components/manager/DirectComms"
import { ShiftOptimizerPanel } from "@/components/manager/ShiftOptimizerPanel"
import StaffingGaps from "@/components/manager/StaffingGaps"
import ManagerAlertsCard from "@/components/manager/ManagerAlertsCard"
import { AIConfigPanel } from "@/components/manager/AIConfigPanel"
import { StaffTable } from "@/components/manager/StaffTable"
import { ScheduleOverview } from "@/components/manager/ScheduleOverview"
import { OvertimeAlerts } from "@/components/manager/OvertimeAlerts"
import { analyzeOvertime } from "@/lib/overtime-analysis"
import { getManagerIncidents } from "@/lib/actions/incidents"
import { WalkthroughActivity } from "@/components/manager/WalkthroughActivity"
import { ExportDataButton } from "@/components/manager/ExportDataButton"
import { TopAppBar } from "@/components/layout/TopAppBar"

export default async function ManagerPage() {
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
          <p className="font-body text-on-surface-variant">Please sign in as manager to access command center.</p>
        </div>
      </main>
    )
  }

  const profileRole = user
    ? (await supabase.from("profiles").select("role").eq("id", user.id).single()).data?.role || null
    : hasDevBypass
      ? devRole
      : null

  if (profileRole !== "manager") {
    return (
      <>
        <TopAppBar />
        <main className="min-h-screen flex items-center justify-center bg-surface px-6 pt-24">
          <div className="text-center max-w-md">
            <span className="material-symbols-outlined text-6xl text-primary mb-4">lock</span>
            <h2 className="font-headline text-3xl text-on-surface mb-2">Manager Access Only</h2>
            <p className="font-body text-on-surface-variant mb-6">
              Your role does not have permission to view the manager dashboard.
            </p>
            <a href="/dashboard" className="btn-primary px-6 py-3 inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back to Dashboard
            </a>
          </div>
        </main>
      </>
    )
  }

  const nowIso = new Date().toISOString()
  const nextDayIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const admin = createAdminClient()

  const [incidentsData, { data: shifts }, { data: profiles }, { data: visitorVolume }, { data: recentMessages }, { data: upcomingEvents }, { data: recentWalkthroughs }] = await Promise.all([
    getManagerIncidents(20),
    supabase.from("shifts").select("*").order("clock_in", { ascending: false }).limit(50),
    admin.from("profiles").select("id, full_name, email, role"),
    supabase.from("visitor_volume").select("count, recorded_at").order("recorded_at", { ascending: false }).limit(7),
    supabase.from("messages").select("id, sender_id, content, created_at, read_at").order("created_at", { ascending: false }).limit(10),
    supabase
      .from("events")
      .select("id, title, start_time")
      .gte("start_time", nowIso)
      .lte("start_time", nextDayIso)
      .order("start_time", { ascending: true })
      .limit(5),
    supabase.from("walkthroughs").select("id, user_id, walkthrough_type, category, completed_at").order("completed_at", { ascending: false }).limit(20),
  ])

  const managerIncidents = Array.isArray(incidentsData) ? incidentsData : []

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]))

  const walkthroughWithNames = (recentWalkthroughs || []).map((w: any) => ({
    ...w,
    user_name: profileMap.get(w.user_id)?.full_name || null,
  }))
  const shiftsWithProfiles = (shifts ?? []).map((s: any) => ({
    ...s,
    profiles: profileMap.get(s.user_id) ?? null,
  }))

  const overtimeShifts = shiftsWithProfiles ? analyzeOvertime(shiftsWithProfiles.filter((s: any) => s.clock_out)) : []
  const overtimeAlerts = overtimeShifts.filter((s) => s.isOvertime)
  const activeShiftCount = (shifts ?? []).filter((s: any) => !s.clock_out).length
  const upcomingEventIds = (upcomingEvents || []).map((event: any) => event.id)
  const nextUpcomingEventTitle = (upcomingEvents || [])[0]?.title || null
  let totalUpcomingAssignments = 0
  let nextUncoveredEventDate: string | null = null

  if (upcomingEventIds.length > 0) {
    const { data: upcomingAssignments } = await supabase
      .from("staff_assignments")
      .select("event_id")
      .in("event_id", upcomingEventIds)

    const coveredEventIds = new Set((upcomingAssignments || []).map((row: any) => Number(row.event_id)))
    const firstUncoveredEvent = (upcomingEvents || []).find((event: any) => !coveredEventIds.has(Number(event.id)))

    if (firstUncoveredEvent?.start_time) {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date(firstUncoveredEvent.start_time))
      const year = parts.find((p) => p.type === "year")?.value || "0000"
      const month = parts.find((p) => p.type === "month")?.value || "01"
      const day = parts.find((p) => p.type === "day")?.value || "01"
      nextUncoveredEventDate = `${year}-${month}-${day}`
    }

    const { count } = await supabase
      .from("staff_assignments")
      .select("id", { count: "exact", head: true })
      .in("event_id", upcomingEventIds)
    totalUpcomingAssignments = count || 0
  }

  const addressAllHref = nextUncoveredEventDate ? `/calendar?date=${nextUncoveredEventDate}` : "/calendar"

  const redFlags: Array<{ id: string; title: string; message: string }> = []

  if (activeShiftCount === 0) {
    redFlags.push({
      id: "staffing-none-active",
      title: "Staffing Gap",
      message: "No employees are currently scheduled on active shift.",
    })
  }

  if (upcomingEventIds.length > 0 && totalUpcomingAssignments === 0) {
    redFlags.push({
      id: "staffing-none-upcoming",
      title: "Upcoming Coverage Missing",
      message: nextUpcomingEventTitle
        ? `No employees are scheduled for upcoming services. Next event: ${nextUpcomingEventTitle}.`
        : "No employees are scheduled for upcoming services.",
    })
  }

  overtimeAlerts.slice(0, 3).forEach((alert: any) => {
    redFlags.push({
      id: `ot-${alert.id}`,
      title: alert.eventTitle || "Unknown Event",
      message: `Overtime Alert: ${alert.paidHours.toFixed(1)}h worked`,
    })
  })

  const visitorRows = (visitorVolume || []).map((point: any) => ({
    count: point.count || 0,
    recorded_at: point.recorded_at,
  }))

  const commsMessages = (recentMessages || []).map((msg: any, idx: number) => {
    const sender = profileMap.get(msg.sender_id)
    const name = sender?.full_name || sender?.email || "Unknown Sender"
    const initials = name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p: string) => p[0]?.toUpperCase())
      .join("") || "UN"
    return {
      id: msg.id,
      name,
      initials,
      lastMessage: msg.content,
      time: new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      isActive: !msg.read_at,
      isHighlighted: idx === 0,
    }
  })

  const overtimeExcessHours = overtimeAlerts.reduce((sum: number, shift: any) => sum + Math.max(0, shift.paidHours - 8), 0)
  const estimatedSavings = overtimeExcessHours * 28
  const optimizerSuggestions = overtimeAlerts.slice(0, 8).map((alert: any) => ({
    id: alert.id,
    eventTitle: alert.eventTitle || "Unknown Event",
    excessHours: Math.max(0, alert.paidHours - 8),
  }))

  return (
    <>
      <TopAppBar />
      <main className="pt-24 pb-16 px-6 max-w-7xl mx-auto space-y-12">
      {/* Hero Section with Command Center Image */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Image Card - Top Left */}
        <div className="lg:col-span-4">
          <div className="relative h-[500px] lg:h-[600px] rounded-2xl overflow-hidden shadow-lg border border-outline-variant/20 bg-black/30">
            <Image
              src="/images/commandcenter.jpg"
              alt="Command Center"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 33vw"
              className="object-contain bg-black/40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <p className="font-label text-[10px] uppercase tracking-[0.1em] text-white/70">Sacred Blueprint</p>
              <h3 className="font-headline text-xl font-bold text-white">Operations Command</h3>
            </div>
          </div>
        </div>

        {/* Title + Actions Card */}
        <div className="lg:col-span-8">
          <div className="h-full rounded-2xl overflow-hidden shadow-lg border border-outline-variant/20 relative bg-surface-container">
            <div className="absolute inset-0 opacity-40">
              <Image
                src="/images/cmndcenter2.png"
                alt=""
                fill
                sizes="66vw"
                className="object-cover"
                aria-hidden="true"
              />
            </div>
            <div className="relative z-10 h-full flex flex-col justify-end p-8 space-y-6">
              <div className="w-fit rounded-2xl bg-surface/80 backdrop-blur-md p-4 border border-outline-variant/20 shadow-lg space-y-1">
                <p className="font-label text-xs uppercase tracking-[0.05em] text-on-surface-variant">Sacred Blueprint / Operations</p>
                <h2 className="text-display-lg text-on-surface">Manager&apos;s Command Center</h2>
              </div>
              <div className="flex flex-wrap gap-3">
                <ExportDataButton
                  data={shiftsWithProfiles || []}
                  filename={`shifts-export-${new Date().toISOString().slice(0, 10)}.csv`}
                />
                <a
                  href="/calendar"
                  className="gold-accents text-on-secondary px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined">add_task</span>
                  Adjust Shifts
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Operations Summary */}
      <ScheduleOverview events={upcomingEvents || []} />

      {/* Bento Grid Dashboard */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <VisitorVolumeChart initialRows={visitorRows} />

        {/* Red Flags Alerts */}
        <div className="bg-tertiary-container text-white rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined">report_problem</span>
              <h3 className="font-headline font-bold text-lg uppercase tracking-tight">Red Flags</h3>
            </div>
            <div className="space-y-4">
              {redFlags.length > 0 ? (
                redFlags.map((flag) => (
                  <div key={flag.id} className="bg-black/20 p-3 rounded-lg">
                    <p className="text-xs font-bold text-on-tertiary-container uppercase">{flag.title}</p>
                    <p className="text-sm font-medium">{flag.message}</p>
                  </div>
                ))
              ) : (
                <div className="bg-black/20 p-3 rounded-lg">
                  <p className="text-sm font-medium">No active red flags.</p>
                </div>
              )}
            </div>
          </div>
          <a
            href={addressAllHref}
            className="mt-6 w-full py-3 bg-white text-tertiary font-bold rounded-lg text-sm hover:bg-surface-container transition-colors inline-flex items-center justify-center"
          >
            Address All
          </a>
        </div>
      </section>

      {/* Ticket Command */}
      <section className="card-surface rounded-2xl p-8 shadow-sm">
        <ManagerTicketCommand />
      </section>

      {/* Staffing Gaps */}
      <section>
        <StaffingGaps />
      </section>

      {/* Manager Alerts */}
      <section>
        <ManagerAlertsCard />
      </section>

      {/* Walkthrough Activity */}
      <section className="bg-surface-container-low rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-primary">clipboard_check</span>
          <h2 className="text-display-sm text-on-surface">Walkthrough Activity</h2>
        </div>
        <WalkthroughActivity initial={walkthroughWithNames} />
      </section>

      {/* Recent Incidents */}
      <section className="bg-surface-container-low rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-tertiary">report</span>
          <h2 className="text-display-sm text-on-surface">Incident Reports</h2>
        </div>
        {managerIncidents.length > 0 ? (
          <div className="space-y-4">
            {managerIncidents.map((incident: any) => (
              <div key={incident.id} className="bg-surface-container rounded-xl p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                    incident.severity === "critical" ? "bg-red-900/30 text-red-400" :
                    incident.severity === "high" ? "bg-orange-900/30 text-orange-400" :
                    "bg-surface-container-high text-on-surface-variant"
                  }`}>
                    {incident.severity || "unknown"}
                  </span>
                  <span className="text-xs text-on-surface-variant">
                    {new Date(incident.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm font-bold text-on-surface">{incident.description?.slice(0, 200)}</p>
                {incident.description?.length > 200 && (
                  <p className="text-xs text-on-surface-variant">Click to view full report</p>
                )}
                <div className="flex gap-2 text-xs text-on-surface-variant">
                  <span>Location: {incident.location || "N/A"}</span>
                  <span>·</span>
                  <span>Shift: {incident.shift || "N/A"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">No incident reports on file.</p>
        )}
      </section>

      {/* AI Configuration */}
      <section>
        <AIConfigPanel />
      </section>

      {/* Staff Activity Table */}
      <StaffTable shifts={shiftsWithProfiles || []} />

      {/* Overtime Alerts */}
      <OvertimeAlerts alerts={overtimeAlerts} />

      {/* Staff Media + Direct Comms */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <MediaFolders />
        </div>
        <div className="lg:col-span-1">
          <DirectComms messages={commsMessages} />
        </div>
      </section>

      <ShiftOptimizerPanel
        initialEstimatedSavings={estimatedSavings}
        initialSuggestions={optimizerSuggestions}
      />
      </main>
    </>
  )
}
