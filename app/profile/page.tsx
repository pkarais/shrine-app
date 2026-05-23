import { createServerClient } from "@/utils/supabase/server"
import { cookies } from "next/headers" // Add this
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

  // Use real user or a role-aware dev identity when bypass mode is active.
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

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .gte("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(5)

  const eventIds = (events || []).map((event: any) => event.id)
  const { data: assignments } = eventIds.length
    ? await supabase
        .from("staff_assignments")
        .select("event_id, user_id, role_assigned")
        .in("event_id", eventIds)
    : { data: [] as any[] }

  const assignmentsByEvent = new Map<number, any[]>()
  for (const assignment of assignments || []) {
    const key = Number(assignment.event_id)
    const list = assignmentsByEvent.get(key) || []
    list.push(assignment)
    assignmentsByEvent.set(key, list)
  }

  const normalizeRequired = (raw: any, fallback: number) => {
    const value = Number(raw)
    if (!Number.isFinite(value) || value <= 0) return fallback
    return value
  }

  const getRoleRequirement = (event: any, role: string) => {
    if (role === "operations") return normalizeRequired(event.required_ops, 1)
    if (role === "security") return normalizeRequired(event.required_security, 1)
    if (role === "greeter") return normalizeRequired(event.required_greeter, 0)
    if (role === "director") return event.director_mandatory ? 1 : 0
    return 0
  }

  const enrichedEvents = (events || []).map((event: any) => {
    const eventAssignments = assignmentsByEvent.get(Number(event.id)) || []
    const counts: Record<string, number> = { operations: 0, security: 0, greeter: 0, director: 0 }

    for (const assignment of eventAssignments) {
      const role = String(assignment.role_assigned || "").toLowerCase()
      if (counts[role] !== undefined) counts[role] += 1
    }

    const myAssignment = eventAssignments.find(
      (assignment) => String(assignment.user_id) === String(effectiveUser.id),
    )

    const requiredForRole = getRoleRequirement(event, currentRole)

    const assignedForRole = counts[currentRole] || 0
    const remainingForRole = Math.max(requiredForRole - assignedForRole, 0)

    return {
      ...event,
      required_total:
        getRoleRequirement(event, "operations") +
        getRoleRequirement(event, "security") +
        getRoleRequirement(event, "greeter") +
        getRoleRequirement(event, "director"),
      assigned_to_me: Boolean(myAssignment),
      my_assignment_role: myAssignment?.role_assigned || null,
      required_for_my_role: requiredForRole,
      assigned_for_my_role: assignedForRole,
      remaining_for_my_role: remainingForRole,
    }
  })

  const { data: shifts } = await supabase
    .from("shifts")
    .select("*, events(title)")
    .eq("user_id", effectiveUser.id)
    .order("clock_in", { ascending: false })
    .limit(10)

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
        <ScheduleList events={enrichedEvents ?? []} />
        <ShiftHistory shifts={shifts ?? []} />
      </div>

      </main>
    </>
  )
}
