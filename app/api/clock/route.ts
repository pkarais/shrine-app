import { NextResponse } from "next/server"
import { createServerClient } from "@/utils/supabase/server"
import { checkGeofence } from "@/lib/geofence"
import { GEOFENCE } from "@/constants"

const SITE_OPEN_HOUR = 9
const SITE_CLOSE_HOUR = 17

function isWithinOperatingHours(date: Date = new Date()): boolean {
  const hour = date.getHours()
  return hour >= SITE_OPEN_HOUR && hour < SITE_CLOSE_HOUR
}

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { eventId, lat, lon, action } = body

    if (!lat || !lon) {
      return NextResponse.json({ error: "Location required" }, { status: 400 })
    }

    const fence = checkGeofence(
      lat, 
      lon, 
      GEOFENCE.LIBERTY_PARK.LAT, 
      GEOFENCE.LIBERTY_PARK.LON, 
      GEOFENCE.LIBERTY_PARK.RADIUS_METERS
    )
    
    if (!fence.inRange) {
      return NextResponse.json({ 
        error: `You are ${Math.round(fence.distance)}m outside the geofence. Clock-in requires being within ${GEOFENCE.LIBERTY_PARK.RADIUS_METERS}m of the site.` 
      }, { status: 403 })
    }

    if (!isWithinOperatingHours()) {
      return NextResponse.json({ 
        error: `Clock-in is only allowed between ${SITE_OPEN_HOUR}:00 AM and ${SITE_CLOSE_HOUR}:00 PM.` 
      }, { status: 403 })
    }

    if (action === "in") {
      const { data, error } = await supabase.from("shifts").insert({
        user_id: user.id,
        event_id: eventId,
        clock_in: new Date().toISOString(),
      })

      if (error) throw error
      return NextResponse.json({ data, success: true })
    } 
    
    if (action === "out") {
      const { data: activeShift } = await supabase
        .from("shifts")
        .select("id")
        .eq("user_id", user.id)
        .is("clock_out", null)
        .single()

      if (!activeShift) {
        return NextResponse.json({ error: "No active shift found" }, { status: 400 })
      }

      const { data, error } = await supabase
        .from("shifts")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", activeShift.id)

      if (error) throw error
      return NextResponse.json({ data, success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: shift } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_id", user.id)
      .is("clock_out", null)
      .single()

    return NextResponse.json({ 
      activeShift: shift,
      operatingHours: { open: SITE_OPEN_HOUR, close: SITE_CLOSE_HOUR }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
