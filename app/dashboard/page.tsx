export const dynamic = 'force-dynamic'

import { createServerClient } from "@/utils/supabase/server"
import { cookies } from "next/headers" // Add this
import { redirect } from "next/navigation"
import { ClockInCard } from "@/components/dashboard/ClockInCard"
import { ShiftTimer } from "@/components/dashboard/ShiftTimer"
import { BreakCountdown } from "@/components/dashboard/BreakCountdown"
import { DailyBrief } from "@/components/dashboard/DailyBrief"
import { MessagingPreview } from "@/components/dashboard/MessagingPreview"
import { QuickSubmit } from "@/components/dashboard/QuickSubmit"
import { MapContext } from "@/components/dashboard/MapContext"
import { RoleActionCenter } from "@/components/dashboard/RoleActionCenter"
import { OperationsActionCards } from "@/components/dashboard/OperationsActionCards"
import { LiveVisitorCountCard } from "@/components/dashboard/LiveVisitorCountCard"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { getCurrentOrNextEvent, getOperationsSummary, getStaffForEvent } from "@/lib/actions/event-context"
import { DashboardMotion } from "@/components/layout/DashboardMotion"

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const hasDevBypass = cookies().get('shrine_dev_session')?.value === 'true'
  const devRole = cookies().get('shrine_dev_role')?.value || 'manager'
  const devName = cookies().get('shrine_dev_name')?.value || (devRole === 'security' ? 'Security Staff (Dev)' : devRole === 'operations' ? 'Operations Staff (Dev)' : 'Shrine Manager (Dev)')

  if (!user && !hasDevBypass) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-primary mb-4">login</span>
          <h2 className="font-headline text-3xl text-on-surface mb-2">Authentication Required</h2>
          <p className="font-body text-on-surface-variant">Please sign in to access your dashboard.</p>
        </div>
      </main>
    )
  }

  // If bypassing, provide a mock profile
  let profile = null
  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    profile = data
  } else if (hasDevBypass) {
    profile = { full_name: devName, role: devRole }
  }

  if ((profile?.role || "").toLowerCase() === "council") {
    redirect("/council")
  }

  const firstName = profile?.full_name?.split(" ")[0] || "User"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  // Fetch Context
  const currentEvent = await getCurrentOrNextEvent()
  const summary = await getOperationsSummary()
  const staffAssignments = currentEvent ? await getStaffForEvent(currentEvent.id) : []
  const role = (profile?.role || "").toLowerCase()
  const showVisitorTally = role !== "council"
  const canUpdateVisitorTally = role === "security" || role === "manager"

  return (
    <>
      <TopAppBar />
      {!user && hasDevBypass && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] w-full max-w-xl px-4">
          <div className="bg-tertiary-container/90 backdrop-blur-md text-on-tertiary-container p-4 rounded-2xl shadow-2xl flex items-center gap-3">
            <span className="material-symbols-outlined text-tertiary">warning</span>
            <div className="text-xs">
              <p className="font-bold">Dev Session Active</p>
              <p className="opacity-80">Database persistence (Tickets/Walkthroughs) is disabled. Log in with a real account to save operational data.</p>
            </div>
          </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        <DashboardMotion>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Main Content Area */}
            <section className="md:col-span-8 space-y-12">
              <div>
                <h2 className="font-headline text-5xl font-extrabold tracking-tight text-primary mb-2 opacity-90">
                  {greeting}, {firstName}.
                </h2>
                <p className="font-body text-lg text-on-surface-variant">
                  The landmark is currently in {currentEvent?.category === 'major_feast' ? 'Major Feast' : 'Regular Service'} state. Geofence active.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ClockInCard eventId={currentEvent?.id ?? null} />
                <ShiftTimer />
                <BreakCountdown />
              </div>

              <DailyBrief event={currentEvent} />
              {showVisitorTally ? (
                <LiveVisitorCountCard eventId={currentEvent?.id} canUpdate={canUpdateVisitorTally} />
              ) : null}
              <RoleActionCenter
                role={profile?.role || "operations"}
                profile={profile}
                event={currentEvent}
                staffAssignments={staffAssignments}
                summary={summary}
              />
              <OperationsActionCards
                eventId={currentEvent?.id ?? null}
                recentWalkthroughs={summary?.recentWalkthroughs || []}
                role={profile?.role || "operations"}
              />
            </section>

            {/* Sidebar */}
            <aside className="md:col-span-4 space-y-8">
              <MessagingPreview />
              <QuickSubmit />
              <MapContext />
              <div className="card-surface overflow-hidden rounded-3xl">
                <img
                  src="/images/chatpg.jpg"
                  alt="Shrine chat view"
                  className="w-full h-auto object-contain"
                />
              </div>
            </aside>
          </div>
        </DashboardMotion>
      </main>
    </>
  )
}
