import { createAdminClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const admin = createAdminClient()

    const tables = [
      "profiles", "events", "staff_assignments", "staff_directory",
      "shifts", "notifications", "messages", "tickets",
      "visitor_volume", "incidents", "conversations",
      "recognition_badges", "gamification_point_rules",
      "employee_badge_awards", "gamification_point_events",
      "leaderboard_periods", "leaderboard_snapshots",
      "badge_nominations", "point_deductions", "point_redemptions",
      "badge_level_definitions",
      "reminder_templates", "reminder_rules",
      "operations_briefs", "operations_brief_sections",
      "v_current_month_leaderboard", "v_employee_badge_progress",
      "v_pending_nominations", "v_employee_of_month_candidates",
      "v_operations_brief_archive",
    ]

    const results: Record<string, any> = {}

    for (const table of tables) {
      const { data, error } = await admin.from(table).select("*").limit(3)
      const countData = await admin.from(table).select("id", { count: "exact", head: true }).limit(0)
      results[table] = {
        exists: error === null || !error?.message?.includes("relation") && !error?.message?.includes("404"),
        error: error?.message ?? null,
        rowCount: countData?.count ?? (data?.length ?? 0),
        columns: data?.length ? Object.keys(data[0]) : null,
        sample: data?.[0] ?? null,
      }
    }

    return NextResponse.json(results)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
