import { NextResponse } from "next/server"
import { createServerClient } from "@/utils/supabase/server"
import { analyzeOvertime } from "@/lib/overtime-analysis"

export async function POST() {
  try {
    const supabase = createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (profile?.role !== "manager") {
      return NextResponse.json({ error: "Manager access required" }, { status: 403 })
    }

    const { data: shifts } = await supabase
      .from("shifts")
      .select("id, clock_in, clock_out, events(title)")
      .not("clock_out", "is", null)
      .order("clock_in", { ascending: false })
      .limit(100)

    const overtimeShifts = analyzeOvertime(shifts || []).filter((shift: any) => shift.isOvertime)

    const suggestions = overtimeShifts.slice(0, 8).map((shift: any) => ({
      id: shift.id,
      eventTitle: shift.events?.title || "Unknown Event",
      excessHours: Math.max(0, shift.paidHours - 8),
    }))

    const totalExcessHours = overtimeShifts.reduce(
      (sum: number, shift: any) => sum + Math.max(0, shift.paidHours - 8),
      0,
    )

    const estimatedSavings = Math.round(totalExcessHours * 28 * 100) / 100

    return NextResponse.json({
      estimatedSavings,
      suggestions,
      generatedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to run optimizer", details: String(error?.message || error) },
      { status: 500 },
    )
  }
}
