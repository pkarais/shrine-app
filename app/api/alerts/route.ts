import { NextResponse } from "next/server"
import { createServerClient } from "@/utils/supabase/server"

export async function GET() {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const alerts: { type: string; message: string; severity: string; id?: string }[] = []

    // Check staffing gaps for upcoming events (next 7 days)
    const now = new Date().toISOString()
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: events } = await supabase
      .from("events")
      .select("id, title, start_time, required_ops, required_security, required_greeter, director_mandatory")
      .gte("start_time", now)
      .lte("start_time", weekFromNow)
      .order("start_time", { ascending: true })

    for (const event of events || []) {
      const { data: assignments } = await supabase
        .from("staff_assignments")
        .select("role_assigned")
        .eq("event_id", event.id)
      const counts: Record<string, number> = { operations: 0, security: 0, greeter: 0, director: 0 }
      assignments?.forEach((a: any) => { if (counts[a.role_assigned] !== undefined) counts[a.role_assigned]++ })
      if (counts.operations < event.required_ops) {
        alerts.push({ type: "staffing", message: `${event.title}: needs ${event.required_ops - counts.operations} more operations staff`, severity: "high" })
      }
      if (counts.security < event.required_security) {
        alerts.push({ type: "staffing", message: `${event.title}: needs ${event.required_security - counts.security} more security staff`, severity: "high" })
      }
      if (counts.greeter < event.required_greeter) {
        alerts.push({ type: "staffing", message: `${event.title}: needs ${event.required_greeter - counts.greeter} more greeters`, severity: "medium" })
      }
      if (event.director_mandatory && counts.director < 1) {
        alerts.push({ type: "staffing", message: `${event.title}: director required but not assigned`, severity: "critical" })
      }
    }

    // Check unread notifications
    const { count: unreadNotifs } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null)
    if (unreadNotifs && unreadNotifs > 0) {
      alerts.push({ type: "notification", message: `You have ${unreadNotifs} unread notification${unreadNotifs > 1 ? "s" : ""}`, severity: "medium" })
    }

    // Check open tickets assigned to user
    const { data: openTickets } = await supabase
      .from("maintenance_tickets")
      .select("id, title, status, priority")
      .eq("assigned_to", user.id)
      .in("status", ["open", "in_progress"])
    if (openTickets && openTickets.length > 0) {
      const highPriority = openTickets.filter((t: any) => t.priority === "high" || t.priority === "critical")
      if (highPriority.length > 0) {
        alerts.push({ type: "ticket", message: `${highPriority.length} high-priority ticket${highPriority.length > 1 ? "s" : ""} assigned to you`, severity: "high" })
      }
      const total = openTickets.length
      if (total > 3) {
        alerts.push({ type: "ticket", message: `You have ${total} open tickets`, severity: "medium" })
      }
    }

    return NextResponse.json({ alerts, total: alerts.length })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch alerts", details: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const body = await request.json()
    const { data, error } = await supabase.from("notifications").insert({
      user_id: user.id,
      title: body.title || body.type || "Alert",
      body: body.message || body.body || "",
      type: body.type || "info",
      reference_id: body.reference_id || null,
    }).select().single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ message: "Alert received", data }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: "Failed to create alert", details: String(error) }, { status: 500 })
  }
}
