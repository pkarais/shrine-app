import { createServerClient } from "@/utils/supabase/server"
import { ManagerTicketCommand } from "@/components/shared/ManagerTicketCommand"
import { cookies } from "next/headers"
import { VisitorVolumeChart } from "@/components/manager/VisitorVolumeChart"
import { MediaFolders } from "@/components/manager/MediaFolders"
import { DirectComms } from "@/components/manager/DirectComms"
import { ShiftOptimizerPanel } from "@/components/manager/ShiftOptimizerPanel"
import { analyzeOvertime } from "@/lib/actions/overtime-analysis"
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

  const [{ data: shifts }, { data: profiles }, { data: visitorVolume }, { data: recentMessages }, { data: upcomingEvents }] = await Promise.all([
    supabase.from("shifts").select("*, user_id, clock_in, clock_out, events(title)").order("clock_in", { ascending: false }).limit(50),
    supabase.from("profiles").select("id, full_name, email, role"),
    supabase.from("visitor_volume").select("count, recorded_at").order("recorded_at", { ascending: false }).limit(7),
    supabase.from("messages").select("id, sender_id, content, created_at, read_at").order("created_at", { ascending: false }).limit(10),
    supabase
      .from("events")
      .select("id, title, start_time")
      .gte("start_time", nowIso)
      .lte("start_time", nextDayIso)
      .order("start_time", { ascending: true })
      .limit(5),
  ])

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]))
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
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
        <div className="lg:col-span-8 space-y-2">
          <p className="font-label text-xs uppercase tracking-[0.05em] text-on-surface-variant">Sacred Blueprint / Operations</p>
          <h2 className="text-display-lg text-on-surface">Manager&apos;s Command Center</h2>
        </div>
        <div className="lg:col-span-4 flex justify-end gap-3">
          <button className="bg-surface-container-highest px-6 py-3 rounded-xl font-semibold flex items-center gap-2 hover:bg-surface-dim transition-colors text-on-surface">
            <span className="material-symbols-outlined">ios_share</span>
            Export Data
          </button>
          <a
            href="/calendar"
            className="gold-accents text-on-secondary px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-sm transition-transform active:scale-95"
          >
            <span className="material-symbols-outlined">add_task</span>
            Adjust Shifts
          </a>
        </div>
      </section>

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
      <section className="bg-white rounded-2xl p-8 shadow-sm">
        <ManagerTicketCommand />
      </section>

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
