export const dynamic = 'force-dynamic'

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { CalendarControls } from "@/components/calendar/CalendarControls"
import { CalendarEventTimeline } from "@/components/calendar/CalendarEventTimeline"
import { injectSundayOrthros } from "@/lib/calendar-defaults"
import { RecurringScheduleCalendar } from "@/components/calendar/RecurringScheduleCalendar"
import { SyncCalendarButton } from "@/components/calendar/SyncCalendarButton"
import { getScheduleForDateRange } from "@/data/employee-schedules"
import { getWeekScheduleAssignments } from "@/lib/actions/staffing"

type AssignmentRow = {
  event_id: number
  role_assigned: string | null
  user_id: string
  profiles?: {
    full_name?: string | null
    email?: string | null
    role?: string | null
  } | null
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: { date?: string; role?: string }
}) {
  const supabaseAuth = createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  const hasDevBypass = cookies().get('shrine_dev_session')?.value === 'true'
  const devRole = cookies().get('shrine_dev_role')?.value || 'manager'

  // Use admin client for DB queries when in dev bypass mode (no auth = RLS blocks anon queries)
  const supabase = (!user && hasDevBypass) ? createAdminClient() : supabaseAuth

  if (!user && !hasDevBypass) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-primary mb-4">login</span>
          <h2 className="font-headline text-3xl text-on-surface mb-2">Authentication Required</h2>
          <p className="font-body text-on-surface-variant">Please sign in to access the calendar.</p>
        </div>
      </main>
    )
  }

  const selectedDateStr = searchParams?.date || new Date().toISOString().split('T')[0]
  const roleFilter = searchParams?.role || "all"
  const CALENDAR_TZ = "America/New_York"

  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }
  
  const localDateKey = (value: string | Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: CALENDAR_TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(value))

    const year = parts.find((p) => p.type === "year")?.value || "0000"
    const month = parts.find((p) => p.type === "month")?.value || "01"
    const day = parts.find((p) => p.type === "day")?.value || "01"
    return `${year}-${month}-${day}`
  }

  // Fetch a wider UTC window, then filter by selected local date in calendar timezone.
  const selectedDateUtc = new Date(`${selectedDateStr}T00:00:00.000Z`)
  const queryStart = new Date(selectedDateUtc.getTime() - 24 * 60 * 60 * 1000).toISOString()
  const queryEnd = new Date(selectedDateUtc.getTime() + 48 * 60 * 60 * 1000).toISOString()

  // Use admin client for events — RLS on events table blocks newly-synced events for auth users
  const admin = createAdminClient()
  const { data: eventsRaw, error } = await admin
    .from("events")
    .select("*")
    .gte("start_time", queryStart)
    .lt("start_time", queryEnd)
    .order("start_time", { ascending: true })

  let events = (eventsRaw || []).filter((event: any) => localDateKey(event.start_time) === selectedDateStr)
  events = events.filter((event: any) => event.title !== "Staff Operational Window" && event.title !== "Open for Tourism")
  events = injectSundayOrthros(selectedDateStr, events)
  events.sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const profileRole = user
    ? (await supabase.from("profiles").select("role").eq("id", user.id).single()).data?.role || null
    : hasDevBypass
      ? devRole
      : null

  const { data: staffProfiles } = await admin
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["operations", "security"])
    .order("full_name", { ascending: true })

  const staffOptions = (staffProfiles || []).map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
    assignable: true,
  }))

  const filteredEventsRaw = (events || []).filter((event) => {
    if (roleFilter === "all") return true
    if (roleFilter === "operations") return event.required_ops == null ? true : event.required_ops > 0
    if (roleFilter === "security") return event.required_security == null ? true : event.required_security > 0
    if (roleFilter === "greeter") return event.required_greeter == null ? true : event.required_greeter > 0
    if (roleFilter === "director") return event.director_mandatory == null ? true : Boolean(event.director_mandatory)
    return true
  })
  const filteredEvents = filteredEventsRaw.length > 0 ? filteredEventsRaw : (events || [])

  const eventIds = (events || []).map((event: any) => event.id).filter((id: number) => id > 0)
  const { data: assignmentRowsRaw } = eventIds.length
    ? await admin
        .from("staff_assignments")
        .select("event_id, role_assigned, user_id")
        .in("event_id", eventIds)
    : { data: [] as any[] }

  const userIds = Array.from(new Set((assignmentRowsRaw || []).map(r => r.user_id).filter(Boolean)))
  const { data: assignProfiles } = userIds.length
    ? await admin.from("profiles").select("id, full_name, email, role").in("id", userIds)
    : { data: [] }
  const assignProfileMap = new Map((assignProfiles || []).map(p => [p.id, p]))
  const assignmentRows = (assignmentRowsRaw || []).map(r => ({
    ...r,
    profiles: assignProfileMap.get(r.user_id) || null,
  }))

  const assignmentLookupByEvent = new Map<number, Record<string, { id: string; name: string; email: string | null }[]>>()
  const roleRosterByDate: Record<string, { id: string; name: string; email: string | null; assignments: number }[]> = {
    operations: [],
    security: [],
    greeter: [],
    director: [],
  }
  const roleRosterMapByDate = new Map<string, Map<string, { id: string; name: string; email: string | null; assignments: number }>>()

  ;(assignmentRows || []).forEach((row: any) => {
    const eventId = Number(row.event_id)
    const role = String(row.role_assigned || "").toLowerCase()
    if (!role) return

    const name = row.profiles?.full_name || row.profiles?.email || `User ${String(row.user_id).slice(0, 8)}`
    const email = row.profiles?.email || null
    const person = { id: String(row.user_id), name, email }

    const byRoleForEvent = assignmentLookupByEvent.get(eventId) || {}
    const existingEventList = byRoleForEvent[role] || []
    if (!existingEventList.some((p) => p.id === person.id)) {
      byRoleForEvent[role] = [...existingEventList, person]
    }
    assignmentLookupByEvent.set(eventId, byRoleForEvent)

    if (!roleRosterMapByDate.has(role)) {
      roleRosterMapByDate.set(role, new Map())
    }
    const roleMap = roleRosterMapByDate.get(role)!
    const existing = roleMap.get(person.id)
    if (existing) {
      existing.assignments += 1
    } else {
      roleMap.set(person.id, { ...person, assignments: 1 })
    }
  })

  roleRosterMapByDate.forEach((peopleMap, role) => {
    roleRosterByDate[role] = Array.from(peopleMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  })

  const assignmentsByEventForTimeline = Object.fromEntries(
    Array.from(assignmentLookupByEvent.entries()).map(([eventId, byRole]) => [String(eventId), byRole]),
  )

  // Cross-reference daily schedule data into event assignments so events show as covered
  const SCHEDULE_ROLE_MAP: Record<string, string> = {
    Paul: "director", Fabio: "operations", Josh: "operations", Paulin: "operations",
    Demetri: "greeter", Marcus: "greeter",
    Teresa: "security", Ryan: "security", Ken: "security", Jose: "security",
  }
  const dailySchedule = getScheduleForDateRange(selectedDateStr, selectedDateStr)
  if (dailySchedule.length > 0) {
    for (const event of events) {
      const eventId = String(event.id)
      const existingByRole = assignmentsByEventForTimeline[eventId] || {}
      for (const s of dailySchedule) {
        if (!s.shiftStart && !s.shiftEnd) continue
        const mappedRole = SCHEDULE_ROLE_MAP[s.staffName]
        if (!mappedRole) continue
        if (!existingByRole[mappedRole]) existingByRole[mappedRole] = []
        const alreadyListed = existingByRole[mappedRole].some((p: any) => p.name === s.staffName)
        if (!alreadyListed) {
          existingByRole[mappedRole].push({
            id: `sched:${s.staffName}`,
            name: s.staffName,
            email: null,
          })
        }
      }
      assignmentsByEventForTimeline[eventId] = existingByRole

      // Also update roleRosterByDate
      for (const [role, people] of Object.entries(existingByRole)) {
        if (!roleRosterByDate[role]) roleRosterByDate[role] = []
        for (const p of people as { id: string; name: string; email: string | null }[]) {
          if (!roleRosterByDate[role].some((x: any) => x.id === p.id)) {
            roleRosterByDate[role].push({ ...p, assignments: 1 })
          }
        }
      }
    }
  }

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7))

  // Determine if any visible event is actually short-staffed (for the legend)
  const hasAnyGap = filteredEvents.some((event: any) => {
    const byRole = assignmentsByEventForTimeline[String(event.id)] || {}
    const secFilled = (byRole["security"] || []).length
    const opsFilled = (byRole["operations"] || []).length
    return secFilled < (event.required_security ?? 1) || opsFilled < (event.required_ops ?? 1)
  })

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return d
  })

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  // Fetch real schedule assignments for the week from Supabase
  const weekStartStr = formatLocalDate(weekDays[0])
  const weekEndStr = formatLocalDate(weekDays[6])
  const weekAssignments = await getWeekScheduleAssignments(weekStartStr, weekEndStr)

  return (
    <>
      <TopAppBar showProfile={false} />
      <main className="pt-24 pb-16 px-6 max-w-7xl mx-auto">
      {/* Editorial Header */}
      <section className="mb-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="font-label text-xs uppercase tracking-widest text-secondary mb-2 block">Operational Overview</span>
            <h2 className="font-headline text-5xl font-extrabold text-primary -ml-1">Operations Calendar</h2>
          </div>
          <div className="flex flex-col items-end gap-3">
            {profileRole === "manager" && <SyncCalendarButton />}
            <CalendarControls
            date={selectedDateStr}
            role={roleFilter}
            canAssign={profileRole === "manager"}
            viewerRole={profileRole || null}
            events={(events || []).map((event) => ({ id: event.id, title: event.title, start_time: event.start_time, end_time: event.end_time || null }))}
            staff={staffOptions}
            roleRosterByDate={roleRosterByDate}
          />
          </div>
        </div>
      </section>

      {/* Calendar Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Liturgy Highlights */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-surface-container-low rounded-[2rem] p-6">
            <h3 className="font-headline text-lg font-bold mb-4 text-primary flex items-center gap-2">
              <span className="material-symbols-outlined">church</span>
              GOA Liturgical
            </h3>
            <div className="space-y-4">
              {events && events.filter(e => e.category === 'major_feast').map((e, idx) => (
                <div key={idx} className="p-4 bg-tertiary-container rounded-xl text-white">
                   <p className="text-xs font-bold opacity-80 mb-1">{new Date(e.start_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}</p>
                   <h4 className="font-bold text-sm">{e.title}</h4>
                   <div className="mt-3 flex items-center gap-1">
                     <div className="w-2 h-2 rounded-full bg-secondary-container" />
                     <span className="text-[10px] font-bold">FEAST DAY</span>
                   </div>
                </div>
              ))}
              {(!events || events.filter(e => e.category === 'major_feast').length === 0) && (
                <p className="text-xs text-on-surface-variant italic">No major feasts scheduled for this day.</p>
              )}
            </div>
          </div>

          <div className="bg-surface-container-low rounded-[2rem] p-6">
            <h3 className="font-headline text-sm font-bold mb-4 text-primary">Requirement Legend</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs">
                <span className="w-3 h-3 rounded-full bg-secondary" />
                <span>Evening Special Event</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span>Standard Operation</span>
              </div>
              {hasAnyGap && (
                <div className="flex items-center gap-3 text-xs bg-error-container/40 p-2 rounded-lg text-error">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span>Critical Staffing Gap</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Calendar View */}
        <div className="lg:col-span-9">
          <div className="bg-surface-container-low rounded-[2rem] overflow-hidden">
            {/* Weekly Header */}
            <div className="overflow-x-auto border-b border-outline-variant/15">
              <div className="grid grid-cols-7 min-w-[560px]">
                {weekDays.map((day, i) => {
                  const dayDateStr = formatLocalDate(day)
                  const isSelected = dayDateStr === selectedDateStr
                  const isSunday = i === 6
                  const dayHref = `/calendar?date=${dayDateStr}&role=${roleFilter}`
                  return (
                    <a
                      key={i}
                      href={dayHref}
                      className={`min-h-[76px] p-3 sm:p-4 text-center transition-colors hover:bg-surface-container-highest ${i < 6 ? "border-r border-outline-variant/15" : ""} ${isSelected ? "bg-primary text-white" : ""}`}
                    >
                      <span className={`block text-[10px] uppercase tracking-tighter ${isSelected ? "opacity-70" : "text-on-surface-variant"}`}>
                        {dayNames[i]}
                      </span>
                      <span className={`font-headline font-bold text-xl ${isSunday && !isSelected ? "text-secondary" : ""}`}>
                        {day.getDate()}
                      </span>
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Event List */}
            <div className="p-6 space-y-4">
              <h3 className="font-headline text-xl font-bold text-primary">
                Schedule for {new Date(`${selectedDateStr}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </h3>
              <div className="space-y-4">
                {filteredEvents && filteredEvents.length > 0 ? (
                  <CalendarEventTimeline
                    events={filteredEvents}
                    canAssign={profileRole === "manager"}
                    staff={staffOptions}
                    viewerRole={profileRole || null}
                    assignmentsByEvent={assignmentsByEventForTimeline}
                  />
                ) : (
                  <div className="text-center py-20 bg-surface-container-lowest rounded-2xl border-2 border-dashed border-outline-variant/20">
                    <span className="material-symbols-outlined text-6xl text-on-surface-variant/20 mb-4 font-light">calendar_today</span>
                    <p className="font-body text-on-surface-variant">No events for the selected role and date.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {profileRole === "manager" && (
        <section className="mt-12">
          <RecurringScheduleCalendar
            selectedDate={selectedDateStr}
            weekAssignments={weekAssignments}
            canEdit={true}
          />
        </section>
      )}

      </main>
    </>
  )
}
