"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { checkGeofence } from "@/lib/geofence"
import { GEOFENCE } from "@/constants"

type ClockInOptions = {
  allowOffsiteManager?: boolean
}

export const clockIn = async (
  eventId: number,
  lat: number,
  lon: number,
  accuracyMeters?: number,
  options?: ClockInOptions
) => {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  if (!profile) {
    throw new Error("Profile not found. Please contact an administrator to set up your account.")
  }

  const isManager = String(profile.role || "").toLowerCase() === "manager"
  const canUseManagerOffsite = Boolean(options?.allowOffsiteManager && isManager)

  // Default path: geofence validation applies to all roles.
  // Exception: manager off-site quick action explicitly requests bypass.
  if (!canUseManagerOffsite) {
    const gpsAccuracy = Number.isFinite(accuracyMeters as number) ? Math.max(0, Number(accuracyMeters)) : 0
    const accuracyBuffer = Math.min(gpsAccuracy, 75)
    const effectiveRadius = GEOFENCE.LIBERTY_PARK.RADIUS_METERS + accuracyBuffer
    const fence = checkGeofence(
      lat,
      lon,
      GEOFENCE.LIBERTY_PARK.LAT,
      GEOFENCE.LIBERTY_PARK.LON,
      effectiveRadius
    )

    if (!fence.inRange) {
      const outsideBy = Math.max(0, Math.round(fence.distance - effectiveRadius))
      throw new Error(
        `You are about ${outsideBy}m outside the Liberty Park geofence. ` +
          `Base radius is ${GEOFENCE.LIBERTY_PARK.RADIUS_METERS}m` +
          `${gpsAccuracy ? ` (GPS accuracy +/- ${Math.round(gpsAccuracy)}m).` : "."}`
      )
    }
  }

  const { data, error } = await supabase
    .from("shifts")
    .insert({
      user_id: user.id,
      event_id: eventId,
      clock_in: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return { success: true, shift: data }
}

export const getActiveShift = async () => {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const admin = createAdminClient()

  // Verify shift belongs to this user
  const { data: shift } = await admin.from("shifts").select("id").eq("id", shiftId).eq("user_id", user.id).single()
  if (!shift) throw new Error("Shift not found")

  const { data, error } = await admin
    .from("shifts")
    .update({ clock_out: new Date().toISOString() })
    .eq("id", shiftId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return { success: true, shift: data }
}
