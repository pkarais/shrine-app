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
            Submit maintenance tickets, send messages to staff, review event schedule and staffing, and monitor live visitor counts.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 items-start">
            <details className="relative w-full sm:w-auto">
              <summary className="btn-primary w-full sm:w-auto px-5 py-3 inline-flex items-center justify-center gap-2 cursor-pointer list-none">
                <span className="material-symbols-outlined">chat</span>
                Message Staff
                <span className="material-symbols-outlined text-base">expand_more</span>
              </summary>
              <div className="absolute left-0 right-0 sm:right-auto mt-2 w-full sm:w-56 rounded-xl border border-outline-variant/20 bg-white shadow-lg z-20 overflow-hidden">
                <Link href="/messages?dept=operations" className="block px-4 py-3 text-sm text-on-surface hover:bg-surface-container-low">
                  Message Operations
                </Link>
                <Link href="/messages?dept=security" className="block px-4 py-3 text-sm text-on-surface hover:bg-surface-container-low border-t border-outline-variant/10">
                  Message Security
                </Link>
              </div>
            </details>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card-surface p-6">
            <h2 className="font-headline text-2xl font-bold text-primary mb-4">Submit Maintenance Ticket</h2>
            <MaintenanceTicketForm eventId={currentEvent?.id || null} />
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
