export const dynamic = 'force-dynamic'

import Link from "next/link"
import Image from "next/image"
import { cookies } from "next/headers"
import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { MaintenanceTicketForm } from "@/components/forms/MaintenanceTicketForm"
import { RunningVisitorCountCard } from "@/components/council/RunningVisitorCountCard"
import { DigitalChantStandPanel } from "@/components/council/DigitalChantStandPanel"
import { MapContext } from "@/components/dashboard/MapContext"
import { ParallaxHero } from "@/components/council/ParallaxHero"
import { getCurrentOrNextEvent } from "@/lib/actions/event-context"
import { toEasternIso, easternDayOfWeek } from "@/lib/eastern-time"

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
    ? (await createAdminClient().from("profiles").select("role").eq("id", user.id).single()).data?.role || null
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

  const admin = createAdminClient()
  const [currentEvent, visitorVolume] = await Promise.all([
    getCurrentOrNextEvent(),
    admin.from("visitor_volume").select("count, recorded_at").order("recorded_at", { ascending: false }).limit(7),
  ])

  // Current week events only — computed in Eastern Time so the week boundary
  // is correct for NYC users (getDay()/getDate() would give UTC day on Vercel).
  const todayEt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date()) // "YYYY-MM-DD"
  const dowEt = easternDayOfWeek(todayEt) // 0=Sun … 6=Sat
  // Walk back to the most recent Sunday, then forward to Saturday.
  const startOfWeekStr = (() => {
    const d = new Date(toEasternIso(todayEt, "12:00"))
    d.setUTCDate(d.getUTCDate() - dowEt)
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d)
  })()
  const endOfWeekStr = (() => {
    const d = new Date(toEasternIso(todayEt, "12:00"))
    d.setUTCDate(d.getUTCDate() + (6 - dowEt))
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d)
  })()
  const startOfWeek = new Date(toEasternIso(startOfWeekStr, "00:00"))
  const endOfWeek = new Date(toEasternIso(endOfWeekStr, "23:59"))

  const { data: weekEvents } = await admin
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
          <Image
            src="/images/logo-color.jpg"
            alt="Saint Nicholas Shrine"
            width={200}
            height={74}
            className="w-40 h-auto object-contain mb-4 dark:hidden"
          />
          <Image
            src="/images/logo-white.png"
            alt="Saint Nicholas Shrine"
            width={200}
            height={74}
            className="w-40 h-auto object-contain mb-4 hidden dark:block"
          />
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
            <Link
              href="/about"
              className="btn-secondary px-5 py-3 inline-flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">info</span>
              About Shrine Ops
            </Link>
            <Link
              href="/about/archive"
              className="btn-secondary px-5 py-3 inline-flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">archive</span>
              Operations Archive
            </Link>
          </div>
        </section>

        {/* Hero banner with parallax scroll effect */}
        <ParallaxHero imageUrl="/images/oversight-hero.jpg" />

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card-surface p-6">
            <h2 className="font-headline text-xl font-bold text-primary mb-4">This Week&apos;s Events</h2>
            <div className="space-y-3">
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

          <div className="space-y-6">
            <MapContext />
            <div className="card-surface overflow-hidden rounded-3xl">
              <Image
                src="/images/chatpg.jpg"
                alt="Shrine chat view"
                width={800}
                height={600}
                sizes="(max-width: 768px) 100vw, 400px"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6">
          <RunningVisitorCountCard initialRows={(visitorVolume.data || []).map((row) => ({ count: row.count || 0, recorded_at: row.recorded_at }))} />
        </section>

        {/* Maintenance Request — moved below so it no longer covers the hero image */}
        <section className="grid grid-cols-1 gap-6">
          <div className="card-surface p-6">
            <h2 className="font-headline text-2xl font-bold text-primary mb-4">Submit Maintenance Request</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              Create a ticket with photos that goes to the staff pool for assignment.
            </p>
            <MaintenanceTicketForm eventId={currentEvent?.id || null} />
          </div>
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
