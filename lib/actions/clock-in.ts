"use server"

import { createServerClient } from "@/utils/supabase/server"
import { checkGeofence } from "@/lib/geofence"
import { GEOFENCE } from "@/constants"

export const clockIn = async (eventId: number, lat: number, lon: number) => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) {
    throw new Error("Profile not found. Please contact an administrator to set up your account.")
  }

  const isManager = profile.role === "manager"

  // Managers can clock in off-site; staff must be within geofence
  if (!isManager) {
    const fence = checkGeofence(lat, lon, GEOFENCE.LIBERTY_PARK.LAT, GEOFENCE.LIBERTY_PARK.LON, GEOFENCE.LIBERTY_PARK.RADIUS_METERS)
    if (!fence.inRange) {
      throw new Error(`You are ${Math.round(fence.distance)}m outside the Liberty Park geofence. Clock-in requires being within ${GEOFENCE.LIBERTY_PARK.RADIUS_METERS}m of the landmark.`)
    }
  }

  const { data, error } = await supabase.from("shifts").insert({
    user_id: user.id,
    event_id: eventId,
    clock_in: new Date().toISOString(),
  }).select().single()

  if (error) throw new Error(error.message)
  return { success: true, shift: data }
}

export const getActiveShift = async () => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("shifts")
    .select("id, clock_in, clock_out, event_id")
    .eq("user_id", user.id)
    .is("clock_out", null)
    .order("clock_in", { ascending: false })
    .limit(1)
    .single()

  return data
}

export const clockOut = async (shiftId: string) => {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from("shifts")
    .update({ clock_out: new Date().toISOString() })
    .eq("id", shiftId)
    .eq("user_id", user.id)
    .select().single()

  if (error) throw new Error(error.message)
  return { success: true, shift: data }
}
