import { NextResponse } from "next/server"
import { clockIn, clockOut } from "@/lib/actions/clock-in"
import { createServerClient } from "@/utils/supabase/server"

async function requireUser() {
  const supabase = createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  return { user, unauthorized: null }
}

async function handleClockOutAction(shiftId: unknown) {
  if (typeof shiftId !== "string" || !shiftId.trim()) {
    return NextResponse.json({ error: "shiftId is required for clock_out" }, { status: 400 })
  }

  const result = await clockOut(shiftId)
  return NextResponse.json(result)
}

async function parseJsonBody(request: Request) {
  try {
    const body = await request.json()
    return { body, error: null as NextResponse | null }
  } catch {
    return {
      body: null,
      error: NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 }),
    }
  }
}

export async function GET() {
  try {
    const { user, unauthorized } = await requireUser()
    if (!user) return unauthorized!

    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("shifts")
      .select("id, clock_in, clock_out, event_id")
      .eq("user_id", user.id)
      .is("clock_out", null)
      .order("clock_in", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch active shift", details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ shift: data ?? null })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch active shift", details: String(error?.message || error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { user, unauthorized } = await requireUser()
    if (!user) return unauthorized!

    const parsed = await parseJsonBody(request)
    if (parsed.error) return parsed.error
    const body = parsed.body || {}
    const action = String(body?.action || "clock_in").toLowerCase()

    if (action === "clock_out") {
      return handleClockOutAction(body?.shiftId)
    }

    const eventId = Number(body?.eventId)
    const lat = Number(body?.lat)
    const lon = Number(body?.lon)
    const accuracyValue = Number(body?.accuracyMeters)
    const accuracyMeters = Number.isFinite(accuracyValue) ? accuracyValue : undefined
    const allowOffsiteManager = Boolean(body?.allowOffsiteManager)

    if (!Number.isInteger(eventId) || eventId <= 0) {
      return NextResponse.json({ error: "A valid eventId is required" }, { status: 400 })
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return NextResponse.json({ error: "Valid lat/lon coordinates are required" }, { status: 400 })
    }

    const result = await clockIn(eventId, lat, lon, accuracyMeters, { allowOffsiteManager })
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Clock action failed", details: String(error?.message || error) },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, unauthorized } = await requireUser()
    if (!user) return unauthorized!

    const parsed = await parseJsonBody(request)
    if (parsed.error) return parsed.error
    const body = parsed.body || {}
    return handleClockOutAction(body?.shiftId)
  } catch (error: any) {
    return NextResponse.json(
      { error: "Clock-out failed", details: String(error?.message || error) },
      { status: 500 }
    )
  }
}
