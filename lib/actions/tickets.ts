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

  const db = user === authUser ? supabase : createAdminClient()

  if (!userRole) {
    const { data: profile } = await db
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

  const { data, error } = await db.from("maintenance_tickets").insert({
    user_id: user.id,
    event_id: eventId,
    title: title.trim(),
    description: description.trim(),
    priority,
    media_urls: mediaUrls,
  }).select("*, events(title)").single()

  if (error) throw new Error(error.message)
  return { success: true, ticket: data }
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

  const db = user === authUser ? supabase : createAdminClient()

  if (!userRole) {
    const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single()
    userRole = profile?.role || ""
  }

  if (userRole !== "operations") {
    throw new Error("Only operations staff can claim tickets")
  }

  const { data: ticket } = await db
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

  const { data, error } = await db
    .from("maintenance_tickets")
    .update({ assigned_to: user.id, status: "in_progress" })
    .eq("id", ticketId)
    .select("*, events(title)")
    .single()

  if (error) throw new Error(error.message)
  return { success: true, ticket: data }
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

  const db = user === authUser ? supabase : createAdminClient()

  if (!userRole) {
    const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single()
    userRole = profile?.role || ""
  }

  if (userRole !== "operations") {
    throw new Error("Only operations staff can complete tickets")
  }

  const { data: ticket } = await db
    .from("maintenance_tickets")
    .select("assigned_to")
    .eq("id", ticketId)
    .single()

  if (!ticket || ticket.assigned_to !== user.id) {
    throw new Error("You can only complete tickets assigned to you")
  }

  const { data, error } = await db
    .from("maintenance_tickets")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", ticketId)
    .select("*, events(title)")
    .single()

  if (error) throw new Error(error.message)
  return { success: true, ticket: data }
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

  const db = user === authUser ? supabase : createAdminClient()

  if (!userRole) {
    const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single()
    userRole = profile?.role || ""
  }

  if (userRole !== "manager") {
    throw new Error("Only managers can assign tickets")
  }

  const { data, error } = await db
    .from("maintenance_tickets")
    .update({ assigned_to: assigneeId, status: "in_progress" })
    .eq("id", ticketId)
    .select("*, events(title)")
    .single()

  if (error) throw new Error(error.message)
  return { success: true, ticket: data }
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

  const db = user === authUser ? supabase : createAdminClient()

  if (!userRole) {
    const { data: profile } = await db.from("profiles").select("role").eq("id", user.id).single()
    userRole = profile?.role || ""
  }

  if (userRole !== "manager") {
    throw new Error("Only managers can unassign tickets")
  }

  const { data, error } = await db
    .from("maintenance_tickets")
    .update({ assigned_to: null, status: "open" })
    .eq("id", ticketId)
    .select("*, events(title)")
    .single()

  if (error) throw new Error(error.message)
  return { success: true, ticket: data }
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
                .select("*, events(title)")
        .order("created_at", { ascending: false })
        .limit(limit)
      if (error) return []
      return data || []
    }
    return []
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile) return []

  let query = supabase
    .from("maintenance_tickets")
            .select("*, events(title)")
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
  return data
}

export const getAssignedTickets = async () => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select("*, events(title)")
    .eq("assigned_to", user.id)
    .in("status", ["open", "in_progress"])
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []

  const userIds = Array.from(new Set(data.map(t => t.user_id).filter(Boolean)))
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds)

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  return data.map(t => ({
    ...t,
    profiles: profileMap.get(t.user_id) || null,
    assigned_profile: t.assigned_to ? profileMap.get(t.assigned_to) || null : null,
  }))
}

export const getUnassignedTickets = async () => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "manager" && profile?.role !== "operations") return []

  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select("*, events(title)")
    .is("assigned_to", null)
    .in("status", ["open"])
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []

  const userIds = Array.from(new Set(data.map(t => t.user_id).filter(Boolean)))
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds)

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  return data.map(t => ({ ...t, profiles: profileMap.get(t.user_id) || null }))
}

export const getTicketCounts = async () => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { unassigned: 0, assignedToMe: 0, open: 0 }

  const { data: profile } = await supabase
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
    supabase
      .from("maintenance_tickets")
      .select("id", { count: "exact", head: true })
      .is("assigned_to", null)
      .in("status", ["open"]),
    supabase
      .from("maintenance_tickets")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", user.id)
      .in("status", ["open", "in_progress"]),
    supabase
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

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "manager") return []

  const { data, error } = await supabase
    .from("maintenance_tickets")
    .select("*, events(title)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) return []

  const userIds = Array.from(new Set(data.flatMap(t => [t.user_id, t.assigned_to]).filter(Boolean)))
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds)

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  return data.map(t => ({
    ...t,
    profiles: profileMap.get(t.user_id) || null,
    assigned_profile: t.assigned_to ? profileMap.get(t.assigned_to) || null : null,
  }))
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

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .in("role", ["operations", "security"])
    .order("full_name", { ascending: true })

  if (error) throw new Error(error.message)
  return data
}
