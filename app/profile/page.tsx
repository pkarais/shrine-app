import { createServerClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { ProfileCard } from "@/components/profile/ProfileCard"
import { ScheduleList } from "@/components/profile/ScheduleList"
import { ShiftHistory } from "@/components/profile/ShiftHistory"
import { TopAppBar } from "@/components/layout/TopAppBar"

export default async function ProfilePage() {
  const supabase = createServerClient()
  const cookieStore = cookies()
  const { data: { user } } = await supabase.auth.getUser()
  const hasDevBypass = cookieStore.get('shrine_dev_session')?.value === 'true'
  const devRole = cookieStore.get('shrine_dev_role')?.value || 'manager'
  const devName = cookieStore.get('shrine_dev_name')?.value || (devRole === 'security' ? 'Security Staff (Dev)' : devRole === 'operations' ? 'Operations Staff (Dev)' : devRole === 'council' ? 'Council Member (Dev)' : 'Shrine Manager (Dev)')
  const devEmail = `dev-${devRole}@shrine.org`

  if (!user && !hasDevBypass) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-primary mb-4">login</span>
          <h2 className="font-headline text-3xl text-on-surface mb-2">Authentication Required</h2>
          <p className="font-body text-on-surface-variant">Please sign in to view your profile.</p>
        </div>
      </main>
    )
  }

  const effectiveUser = user || {
    id: "00000000-0000-0000-0000-000000000000",
    email: devEmail,
    role: devRole,
    full_name: devName,
    created_at: new Date().toISOString(),
  }

  const { data: profileForRole } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null }

  const currentRole = ((profileForRole?.role || effectiveUser.role || devRole || "") as string).toLowerCase()
  const isCouncil = currentRole === "council"
  const isStaff = ["operations", "security"].includes(currentRole)

  let enrichedEvents: any[] = []
  let completedShifts: any[] = []

  if (isStaff) {
    // Staff: upcoming events where they are assigned
    const { data: myAssignments } = await supabase
      .from("staff_assignments")
      .select("event_id, role_assigned")
      .eq("user_id", effectiveUser.id)

    const myEventIds = (myAssignments || []).map((a: any) => a.event_id)

    if (myEventIds.length > 0) {
      const { data: events } = await supabase
        .from("events")
        .select("*")
        .in("id", myEventIds)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(10)

      enrichedEvents = (events || []).map((event: any) => {
        const myAssignment = (myAssignments || []).find((a: any) => a.event_id === event.id)
        return {
          ...event,
          assigned_to_me: true,
          my_assignment_role: myAssignment?.role_assigned || null,
        }
      })
    }

    // Staff: completed shifts only (clock_out not null)
    const { data: shifts } = await supabase
      .from("shifts")
      .select("*, events(title)")
      .eq("user_id", effectiveUser.id)
      .not("clock_out", "is", null)
      .order("clock_in", { ascending: false })
      .limit(20)

    completedShifts = shifts || []
  }

  return (
    <>
      <TopAppBar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12 sm:pb-16">
      <div className="mb-12">
        <span className="font-label text-xs uppercase tracking-widest text-secondary mb-2 block">Your Account</span>
        <h1 className="font-headline text-4xl sm:text-5xl font-extrabold text-primary -ml-1">Profile</h1>
      </div>

      <div className="space-y-8">
        <ProfileCard user={effectiveUser} />
        {isStaff && (
          <>
            <ScheduleList events={enrichedEvents} />
            <ShiftHistory shifts={completedShifts} />
          </>
        )}
      </div>

      </main>
    </>
  )
}
