"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

interface IncidentData {
  eventId: number | null
  incidentDate: string
  shift: "opening" | "midday" | "closing"
  location: string
  incidentTypes: string[]
  description: string
  severity: "low" | "medium" | "high" | "critical"
  involvedPersonName?: string
  involvedPersonDescription?: string
  involvedPersonContact?: string
  witnessName?: string
  witnessContact?: string
  witnessStatement?: string
  actionsTaken: string[]
  authoritiesContacted: boolean
  agencyContacted?: string[]
  officerNameBadge?: string
  caseNumber?: string
  evidencePhotos: boolean
  evidenceFootage: boolean
  evidenceStatements: boolean
  cameraLocation?: string
  followUpRequired: string[]
  followUpDetails?: string
  mediaUrls?: string[]
}

export const submitIncident = async (data: IncidentData) => {
  const supabase = createServerClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  
  let user = authUser

  if (!user) {
    const hasDevBypass = cookies().get('shrine_dev_session')?.value === 'true'
    if (hasDevBypass && process.env.NODE_ENV === 'development') {
      const admin = createAdminClient()
      const { data: anyUser } = await admin.from("profiles").select("id").limit(1).single()
      if (anyUser) {
        user = { id: anyUser.id } as any
      }
    }
  }

  if (!user) throw new Error("Unauthorized. Please log in to your Supabase account to save operational data.")

  const db = user === authUser ? supabase : createAdminClient()

  const { data: result, error } = await db.from("incidents").insert({
    user_id: user.id,
    event_id: data.eventId,
    incident_date: data.incidentDate || new Date().toISOString(),
    shift: data.shift,
    location: data.location,
    incident_types: data.incidentTypes,
    description: data.description.trim(),
    severity: data.severity,
    involved_person_name: data.involvedPersonName || null,
    involved_person_description: data.involvedPersonDescription || null,
    involved_person_contact: data.involvedPersonContact || null,
    witness_name: data.witnessName || null,
    witness_contact: data.witnessContact || null,
    witness_statement: data.witnessStatement || null,
    actions_taken: data.actionsTaken,
    authorities_contacted: data.authoritiesContacted,
    agency_contacted: data.agencyContacted || [],
    officer_name_badge: data.officerNameBadge || null,
    case_number: data.caseNumber || null,
    evidence_photos: data.evidencePhotos,
    evidence_footage: data.evidenceFootage,
    evidence_statements: data.evidenceStatements,
    camera_location: data.cameraLocation || null,
    follow_up_required: data.followUpRequired,
    follow_up_details: data.followUpDetails || null,
    media_urls: data.mediaUrls || [],
  }).select("*").single()

  if (error) throw new Error(error.message)
  return { success: true, incident: result }
}

const enrichIncidentsWithEvents = async (supabase: any, incidents: any[]) => {
  const eventIds: number[] = Array.from(new Set(incidents.map((i: any) => i.event_id).filter(Boolean)))
  if (eventIds.length === 0) return incidents
  const { data: events } = await supabase.from("events").select("id, title").in("id", eventIds)
  const eventMap = new Map((events || []).map((e: any) => [e.id, e]))
  return incidents.map((i: any) => ({ ...i, events: eventMap.get(i.event_id) || null }))
}

export const getUserIncidents = async (limit = 20) => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return enrichIncidentsWithEvents(supabase, data || [])
}

export const getManagerIncidents = async (limit = 50) => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "manager") return []

  const { data, error } = await supabase
    .from("incidents")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return enrichIncidentsWithEvents(supabase, data || [])
}
