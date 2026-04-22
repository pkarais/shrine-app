"use server"
import { createServerClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { cookies } from "next/headers"
import { createHash } from "crypto"

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function deterministicUuid(input: string) {
  const hash = createHash("sha1").update(input).digest("hex")
  const part1 = hash.slice(0, 8)
  const part2 = hash.slice(8, 12)
  const part3 = `5${hash.slice(13, 16)}`
  const part4 = `a${hash.slice(17, 20)}`
  const part5 = hash.slice(20, 32)
  return `${part1}-${part2}-${part3}-${part4}-${part5}`
}

function normalizeAssigneeId(rawId: string) {
  const value = String(rawId || "").trim()
  if (isUuid(value)) return value
  return deterministicUuid(value)
}

export async function validateStaffingForEvent(eventId: number) {
  const supabase = createServerClient()
  const { data: event } = await supabase.from("events").select("*").eq("id", eventId).single()
  if (!event) throw new Error("Event not found")
  const { data: assignments } = await supabase
    .from("staff_assignments")
    .select("role_assigned")
    .eq("event_id", eventId)
  const counts: Record<string, number> = { operations: 0, security: 0, greeter: 0, director: 0 }
  assignments?.forEach((a: any) => { if (counts[a.role_assigned] !== undefined) counts[a.role_assigned]++ })
  const gaps = []
  if (counts.operations < event.required_ops) gaps.push({ role: "operations", needed: event.required_ops, assigned: counts.operations })
  if (counts.security < event.required_security) gaps.push({ role: "security", needed: event.required_security, assigned: counts.security })
  if (counts.greeter < event.required_greeter) gaps.push({ role: "greeter", needed: event.required_greeter, assigned: counts.greeter })
  if (event.director_mandatory && counts.director < 1) gaps.push({ role: "director", needed: 1, assigned: counts.director })
  return { sufficient: gaps.length === 0, gaps, event }
}

export async function getStaffingGaps(dateFrom?: string, dateTo?: string) {
  const supabase = createServerClient()
  let query = supabase.from("events").select("*").order("start_time", { ascending: true })
  if (dateFrom) query = query.gte("start_time", dateFrom)
  if (dateTo) query = query.lte("start_time", dateTo)
  const { data: events } = await query
  const gaps = []
  for (const event of events || []) {
    const result = await validateStaffingForEvent(event.id)
    if (!result.sufficient) gaps.push({ event: event.title, eventId: event.id, gaps: result.gaps, startTime: event.start_time })
  }
  return gaps
}

export async function assignStaff(eventId: number, userId: string, role: string, shiftStart?: string, shiftEnd?: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const hasDevBypass = cookies().get("shrine_dev_session")?.value === "true"

  let dbClient: any = supabase

  if (!user) {
    if (!hasDevBypass) {
      throw new Error("Unauthorized")
    }

    const admin = createAdminClient()
    if (!admin) {
      throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for dev bypass assignment. Sign in as manager (not bypass) or set SUPABASE_SERVICE_ROLE_KEY in .env.local.")
    }
    dbClient = admin
  } else {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    if (profile?.role !== "manager") throw new Error("Only managers can assign staff")
  }

  const normalizedAssigneeId = normalizeAssigneeId(userId)

  const { data, error } = await dbClient.from("staff_assignments").insert({
    event_id: eventId, user_id: normalizedAssigneeId, role_assigned: role, shift_start: shiftStart, shift_end: shiftEnd,
  }).select("*").single()
  if (error) throw new Error(error.message)
  return { success: true, assignment: data }
}

export async function getEventAssignments(eventId: number) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from("staff_assignments")
    .select("*, profiles!staff_assignments_user_id_fkey(full_name, email)")
    .eq("event_id", eventId)
  if (error) throw new Error(error.message)
  return data
}
