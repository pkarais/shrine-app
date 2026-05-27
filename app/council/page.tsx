import Link from "next/link"
import { cookies } from "next/headers"
import { createServerClient } from "@/utils/supabase/server"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { MaintenanceTicketForm } from "@/components/forms/MaintenanceTicketForm"
import { RunningVisitorCountCard } from "@/components/council/RunningVisitorCountCard"
import { DigitalChantStandPanel } from "@/components/council/DigitalChantStandPanel"
import { getCurrentOrNextEvent } from "@/lib/actions/event-context"

export default async function CouncilDashboardPage() {
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
          <p className="font-body text-on-surface-variant">Please sign in to access council dashboard.</p>
        </div>
      </main>
    )
  }

  const profileRole = user
    ? (await supabase.from("profiles").select("role").eq("id", user.id).single()).data?.role || null
    : hasDevBypass
      ? devRole
      : null

  if (String(profileRole || "").toLowerCase() !== "council") {
    return (
      <>
        <TopAppBar />
        <main className="min-h-screen flex items-center justify-center bg-surface px-6 pt-24">
          <div className="text-center max-w-md">
            <span className="material-symbols-outlined text-6xl text-primary mb-4">lock</span>
            <h2 className="font-headline text-3xl text-on-surface mb-2">Council Access Only</h2>
            <p className="font-body text-on-surface-variant mb-6">This dashboard is reserved for council members.</p>
            <a href="/dashboard" className="btn-primary px-6 py-3 inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back to Dashboard
            </a>
          </div>
        </main>
      </>
    )
  }

  const [currentEvent, visitorVolume] = await Promise.all([
    getCurrentOrNextEvent(),
    supabase.from("visitor_volume").select("count, recorded_at").order("recorded_at", { ascending: false }).limit(7),
  ])

  // Current week events only
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)
  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  const { data: weekEvents } = await supabase
    .from("events")
    .select("*")
    .gte("start_time", startOfWeek.toISOString())
    .lte("start_time", endOfWeek.toISOString())
    .order("start_time", { ascending: true })

  const chapelUrl = "https://www.goarch.org/chapel"
  const today = new Date()
  const dcsUrl = `https://dcs.goarch.org/goa/dcs/indexes/${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}.html`

  return (
    <>
      <TopAppBar />
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16 space-y-8">
        <section className="card-surface p-8">
          <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-2">Council Portal</p>
          <h1 className="font-headline text-4xl font-extrabold text-primary">Council Dashboard</h1>
          <p className="text-on-surface-variant mt-2">
            Submit maintenance requests, message the manager, review this week&apos;s events, and monitor visitor counts.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 items-start">
            <Link
              href="/messages"
              className="btn-primary px-5 py-3 inline-flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">chat</span>
              Message Manager
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-surface p-6">
            <h2 className="font-headline text-2xl font-bold text-primary mb-4">Submit Maintenance Request</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Create a ticket with photos that goes to the staff pool for assignment.
            </p>
            <MaintenanceTicketForm eventId={currentEvent?.id || null} />
          </div>

          <div className="card-surface p-6">
            <h2 className="font-headline text-xl font-bold text-primary mb-4">This Week&apos;s Events</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {(weekEvents || []).length > 0 ? (
                (weekEvents || []).map((event: any) => (
                  <div key={event.id} className="p-3 bg-surface-container-low rounded-xl">
                    <p className="font-bold text-sm text-on-surface">{event.title}</p>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(event.start_time).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-on-surface-variant italic">No events scheduled this week.</p>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6">
          <RunningVisitorCountCard initialRows={(visitorVolume.data || []).map((row) => ({ count: row.count || 0, recorded_at: row.recorded_at }))} />
        </section>

        <section className="grid grid-cols-1 gap-6">
          <div className="card-surface p-6">
            <h2 className="font-headline text-xl font-bold text-primary mb-3">Liturgical Reference</h2>
            <p className="text-sm text-on-surface-variant mb-4">Digital Chant Stand is embedded below. Chapel opens in a separate tab.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <a
                href={chapelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary px-4 py-2 inline-flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">open_in_new</span>
                Open Chapel
              </a>
            </div>
            <p className="text-xs text-on-surface-variant mb-3">
              Chapel opens in a separate tab. Digital Chant Stand loads only when you choose to open it.
            </p>
            <DigitalChantStandPanel dcsUrl={dcsUrl} />
          </div>
        </section>
      </main>
    </>
  )
}
