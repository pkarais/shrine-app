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

  const fence = checkGeofence(lat, lon, GEOFENCE.LIBERTY_PARK.LAT, GEOFENCE.LIBERTY_PARK.LON, GEOFENCE.LIBERTY_PARK.RADIUS_METERS)
  if (!fence.inRange) {
    throw new Error(`You are ${Math.round(fence.distance)}m outside the Liberty Park geofence. Clock-in requires being within ${GEOFENCE.LIBERTY_PARK.RADIUS_METERS}m of the landmark.`)
  }

  const { data, error } = await supabase.from("shifts").insert({
    user_id: user.id,
    event_id: eventId,
    clock_in: new Date().toISOString(),
  })

  return { data, error }
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

  return { data, error }
}
