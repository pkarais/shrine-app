"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

export const createTicket = async (
  eventId: number | null,
  title: string,
  description: string,
  priority: "low" | "medium" | "high" | "urgent",
  mediaUrls: string[] = []
) => {
  const supabase = createServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  let user = authUser
  let userRole = ""

  if (!user) {
    const hasDevBypass = cookies().get('shrine_dev_session')?.value === 'true'
    if (hasDevBypass && process.env.NODE_ENV === 'development') {
      const admin = createAdminClient()
      const { data: anyUser } = await admin.from("profiles").select("id, role").limit(1).single()
      if (anyUser) {
        user = { id: anyUser.id } as any
        userRole = anyUser.role
      }
    }
  }

  if (!user) throw new Error("Unauthorized. Please log in to your Supabase account to save operational data.")

  const admin = createAdminClient()

  if (!userRole) {
    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    userRole = profile?.role || ""
  }

  const allowedRoles = ["operations", "security", "manager", "council", "staff", "volunteer"]
  if (!allowedRoles.includes(userRole.toLowerCase())) {
    throw new Error("You must be a staff member to create maintenance tickets")
  }

  const { data, error } = await admin.from("maintenance_tickets").insert({
    user_id: user.id,
    event_id: eventId,
    title: title.trim(),
    description: description.trim(),
    priority,
    media_urls: mediaUrls,
  }).select("*").single()

  if (error) throw new Error(error.message)
  return { success: true, ticket: await enrichWithEvents(admin, data) }
}

export const claimTicket = async (ticketId: string) => {
  const supabase = createServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  let user = authUser
  let userRole = ""

  if (!user) {
    const hasDevBypass = cookies().get('shrine_dev_session')?.value === 'true'
    if (hasDevBypass && process.env.NODE_ENV === 'development') {
      const admin = createAdminClient()
      const { data: anyUser } = await admin.from("profiles").select("id, role").eq("role", "operations").limit(1).single()
      if (anyUser) {
        user = { id: anyUser.id } as any
        userRole = anyUser.role
      }
    }
  }

  if (!user) throw new Error("Unauthorized")

  const admin = createAdminClient()

  if (!userRole) {
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
    userRole = profile?.role || ""
  }

  if (userRole !== "operations") {
    throw new Error("Only operations staff can claim tickets")
  }

  const { data: ticket } = await admin
    .from("maintenance_tickets")
    .select("assigned_to, status")
    .eq("id", ticketId)
    .single()

  if (!ticket) throw new Error("Ticket not found")
  if (ticket.assigned_to && ticket.assigned_to !== user.id) {
    throw new Error("Ticket is already assigned to someone else")
  }
  if (ticket.status !== "open") {
    throw new Error("Can only claim open tickets")
  }

  const { data, error } = await admin
    .from("maintenance_tickets")
    .update({ assigned_to: user.id, status: "in_progress" })
    .eq("id", ticketId)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return { success: true, ticket: await enrichWithEvents(admin, data) }
}

export const completeTicket = async (ticketId: string) => {
  const supabase = createServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  let user = authUser
  let userRole = ""

  if (!user) {
    const hasDevBypass = cookies().get('shrine_dev_session')?.value === 'true'
    if (hasDevBypass && process.env.NODE_ENV === 'development') {
      const admin = createAdminClient()
      const { data: anyUser } = await admin.from("profiles").select("id, role").eq("role", "operations").limit(1).single()
      if (anyUser) {
        user = { id: anyUser.id } as any
        userRole = anyUser.role
      }
    }
  }

  if (!user) throw new Error("Unauthorized")

  const admin = createAdminClient()

  if (!userRole) {
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
    userRole = profile?.role || ""
  }

  if (userRole !== "operations") {
    throw new Error("Only operations staff can complete tickets")
  }

  const { data: ticket } = await admin
    .from("maintenance_tickets")
    .select("assigned_to")
    .eq("id", ticketId)
    .single()

  if (!ticket || ticket.assigned_to !== user.id) {
    throw new Error("You can only complete tickets assigned to you")
  }

  const { data, error } = await admin
    .from("maintenance_tickets")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", ticketId)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return { success: true, ticket: await enrichWithEvents(admin, data) }
}

export const assignTicket = async (ticketId: string, assigneeId: string) => {
  const supabase = createServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  let user = authUser
  let userRole = ""

  if (!user) {
    const hasDevBypass = cookies().get('shrine_dev_session')?.value === 'true'
    if (hasDevBypass && process.env.NODE_ENV === 'development') {
      const admin = createAdminClient()
      const { data: anyUser } = await admin.from("profiles").select("id, role").eq("role", "manager").limit(1).single()
      if (anyUser) {
        user = { id: anyUser.id } as any
        userRole = anyUser.role
      }
    }
  }

  if (!user) throw new Error("Unauthorized")

  const admin = createAdminClient()

  if (!userRole) {
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
    userRole = profile?.role || ""
  }

  if (userRole !== "manager") {
    throw new Error("Only managers can assign tickets")
  }

  const { data, error } = await admin
    .from("maintenance_tickets")
    .update({ assigned_to: assigneeId, status: "in_progress" })
    .eq("id", ticketId)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return { success: true, ticket: await enrichWithEvents(admin, data) }
}

export const unassignTicket = async (ticketId: string) => {
  const supabase = createServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  let user = authUser
  let userRole = ""

  if (!user) {
    const hasDevBypass = cookies().get('shrine_dev_session')?.value === 'true'
    if (hasDevBypass && process.env.NODE_ENV === 'development') {
      const admin = createAdminClient()
      const { data: anyUser } = await admin.from("profiles").select("id, role").eq("role", "manager").limit(1).single()
      if (anyUser) {
        user = { id: anyUser.id } as any
        userRole = anyUser.role
      }
    }
  }

  if (!user) throw new Error("Unauthorized")

  const admin = createAdminClient()

  if (!userRole) {
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
    userRole = profile?.role || ""
  }

  if (userRole !== "manager") {
    throw new Error("Only managers can unassign tickets")
  }

  const { data, error } = await admin
    .from("maintenance_tickets")
    .update({ assigned_to: null, status: "open" })
    .eq("id", ticketId)
    .select("*")
    .single()

  if (error) throw new Error(error.message)
  return { success: true, ticket: await enrichWithEvents(admin, data) }
}

export const getUserTickets = async (limit = 20) => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Dev bypass: use admin client and return all tickets
  if (!user) {
    const hasDevBypass = cookies().get('shrine_dev_session')?.value === 'true'
    if (hasDevBypass && process.env.NODE_ENV === 'development') {
      const admin = createAdminClient()
      const { data, error } = await admin
        .from("maintenance_tickets")
                .select("*")
        .order("created_at", { ascending: false })
        .limit(limit)
      if (error) return []
      return enrichTicketsWithEvents(admin, data || [])
    }
    return []
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) return []

  let query = admin
    .from("maintenance_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (profile.role === "operations") {
    query = query.or(`assigned_to.eq.${user.id},user_id.eq.${user.id},assigned_to.is.null`)
  } else if (profile.role === "security") {
    query = query.eq("user_id", user.id)
  } else if (profile.role === "council") {
    query = query.eq("user_id", user.id)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []

  const userIds = Array.from(new Set(data.flatMap(t => [t.user_id, t.assigned_to]).filter(Boolean)))
  const [{ data: profiles }, enriched] = await Promise.all([
    admin.from("profiles").select("id, full_name, email").in("id", userIds),
    enrichTicketsWithEvents(admin, data),
  ])

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  return enriched.map(t => ({
    ...t,
    profiles: profileMap.get(t.user_id) || null,
    assigned_profile: t.assigned_to ? profileMap.get(t.assigned_to) || null : null,
  }))
}

export const getAssignedTickets = async () => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("maintenance_tickets")
    .select("*")
    .eq("assigned_to", user.id)
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []

  const userIds = Array.from(new Set(data.map(t => t.user_id).filter(Boolean)))
  const eventIds = Array.from(new Set(data.map(t => t.event_id).filter(Boolean)))
  const [{ data: profiles }, { data: events }] = await Promise.all([
    admin.from("profiles").select("id, full_name, email").in("id", userIds),
    eventIds.length > 0
      ? admin.from("events").select("id, title").in("id", eventIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  const eventMap = new Map((events || []).map(e => [e.id, e]))
  return data.map(t => ({
    ...t,
    events: eventMap.get(t.event_id) || null,
    profiles: profileMap.get(t.user_id) || null,
    assigned_profile: t.assigned_to ? profileMap.get(t.assigned_to) || null : null,
  }))
}

export const getUnassignedTickets = async () => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "manager" && profile?.role !== "operations") return []

  const { data, error } = await admin
    .from("maintenance_tickets")
    .select("*")
    .is("assigned_to", null)
    .in("status", ["open"])
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []

  const userIds = Array.from(new Set(data.map(t => t.user_id).filter(Boolean)))
  const [{ data: profiles }, enriched] = await Promise.all([
    admin.from("profiles").select("id, full_name, email").in("id", userIds),
    enrichTicketsWithEvents(admin, data),
  ])

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  return enriched.map(t => ({ ...t, profiles: profileMap.get(t.user_id) || null }))
}

export const getTicketCounts = async () => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { unassigned: 0, assignedToMe: 0, open: 0 }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) return { unassigned: 0, assignedToMe: 0, open: 0 }

  const [
    { count: unassigned },
    { count: assignedToMe },
    { count: open },
  ] = await Promise.all([
    admin
      .from("maintenance_tickets")
      .select("id", { count: "exact", head: true })
      .is("assigned_to", null)
      .in("status", ["open"]),
    admin
      .from("maintenance_tickets")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", user.id)
      .in("status", ["open", "in_progress"]),
    admin
      .from("maintenance_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress"]),
  ])

  return {
    unassigned: unassigned || 0,
    assignedToMe: assignedToMe || 0,
    open: open || 0,
  }
}

export const getManagerTickets = async (limit = 50) => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "manager") return []

  const { data, error } = await admin
    .from("maintenance_tickets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []

  const userIds = Array.from(new Set(data.flatMap(t => [t.user_id, t.assigned_to]).filter(Boolean)))
  const [{ data: profiles }, enriched] = await Promise.all([
    admin.from("profiles").select("id, full_name, email").in("id", userIds),
    enrichTicketsWithEvents(admin, data),
  ])

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  return enriched.map(t => ({
    ...t,
    profiles: profileMap.get(t.user_id) || null,
    assigned_profile: t.assigned_to ? profileMap.get(t.assigned_to) || null : null,
  }))
}

const enrichWithEvents = async (supabase: any, ticket: any) => {
  if (!ticket?.event_id) return ticket
  const { data: event } = await supabase.from("events").select("title").eq("id", ticket.event_id).single()
  return { ...ticket, events: event || null }
}

const enrichTicketsWithEvents = async (supabase: any, tickets: any[]) => {
  const eventIds: number[] = Array.from(new Set(tickets.map((t: any) => t.event_id).filter(Boolean)))
  if (eventIds.length === 0) return tickets
  const { data: events } = await supabase.from("events").select("id, title").in("id", eventIds)
  const eventMap = new Map((events || []).map((e: any) => [e.id, e]))
  return tickets.map((t: any) => ({ ...t, events: eventMap.get(t.event_id) || null }))
}

export const deleteTicket = async (ticketId: string) => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "manager") throw new Error("Manager access required")

  const { error } = await admin.from("maintenance_tickets").delete().eq("id", ticketId)
  if (error) throw new Error(error.message)
  return { success: true }
}

export const getOperationsStaff = async () => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "manager") return []

  const admin = createAdminClient()

  const { data: staffDir } = await admin
    .from("staff_directory")
    .select("*")
    .limit(500)

  const directoryStaff = (staffDir || []).map((row: any, idx: number) => {
    const rawRole = row.role || row.department || "operations"
    const name = row.full_name || row.name || row.staff_name
    return {
      id: row.profile_id || row.user_id || row.id || `directory:${name || idx}`,
      full_name: name,
      email: row.email || row.staff_email,
      role: String(rawRole).toLowerCase(),
    }
  }).filter((s: any) => s.full_name)

  const { data: dbProfiles, error } = await admin
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["operations", "security"])
    .order("full_name", { ascending: true })

  if (error) throw new Error(error.message)

  const merged = [...(dbProfiles || []), ...directoryStaff]
  const seen = new Set()
  return merged.filter((s: any) => {
    const key = s.id || s.full_name
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
