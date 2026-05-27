"use server"

import { createServerClient } from "@/utils/supabase/server"

export async function getManagerShiftReport(shiftId?: string) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single()
  if (!profile || !["manager", "admin"].includes(profile.role)) throw new Error("Manager access required")

  // Get the shift — either specified or active one
  let shift: any = null
  if (shiftId) {
    const { data } = await supabase.from("shifts").select("*").eq("id", shiftId).eq("user_id", user.id).single()
    shift = data
  } else {
    const { data } = await supabase
      .from("shifts")
      .select("*")
      .eq("user_id", user.id)
      .order("clock_in", { ascending: false })
      .limit(1)
      .single()
    shift = data
  }

  if (!shift) return null

  const clockIn = new Date(shift.clock_in)
  const clockOut = shift.clock_out ? new Date(shift.clock_out) : new Date()

  // Query all activity during this shift
  const [
    { data: walkthroughs },
    { data: incidents },
    { data: ticketsCreated },
    { data: ticketsAssigned },
    { data: messages },
    { data: staffAssignments },
    { data: alerts },
    { data: sopUploads },
  ] = await Promise.all([
    supabase.from("walkthroughs").select("walkthrough_type, category, completed_at").eq("user_id", user.id).gte("completed_at", clockIn.toISOString()).lte("completed_at", clockOut.toISOString()),
    supabase.from("incidents").select("severity, description, location, created_at").eq("user_id", user.id).gte("created_at", clockIn.toISOString()).lte("created_at", clockOut.toISOString()),
    supabase.from("maintenance_tickets").select("title, priority, status, created_at").eq("user_id", user.id).gte("created_at", clockIn.toISOString()).lte("created_at", clockOut.toISOString()),
    supabase.from("maintenance_tickets").select("title, priority, status, updated_at").eq("assigned_to", user.id).gte("updated_at", clockIn.toISOString()).lte("updated_at", clockOut.toISOString()),
    supabase.from("messages").select("content, created_at").eq("sender_id", user.id).gte("created_at", clockIn.toISOString()).lte("created_at", clockOut.toISOString()),
    supabase.from("staff_assignments").select("event_id, role, created_at").eq("user_id", user.id).gte("created_at", clockIn.toISOString()).lte("created_at", clockOut.toISOString()),
    supabase.from("manager_alerts").select("alert_type, message, created_at").eq("triggered_by", user.email).gte("created_at", clockIn.toISOString()).lte("created_at", clockOut.toISOString()),
    supabase.from("sop_documents").select("title, category, file_name, created_at").eq("uploaded_by", user.id).gte("created_at", clockIn.toISOString()).lte("created_at", clockOut.toISOString()),
  ])

  const totalHours = shift.clock_out
    ? ((new Date(shift.clock_out).getTime() - new Date(shift.clock_in).getTime()) / (1000 * 60 * 60))
    : ((Date.now() - new Date(shift.clock_in).getTime()) / (1000 * 60 * 60))

  return {
    shift,
    managerName: profile?.full_name || user.email,
    clockIn: shift.clock_in,
    clockOut: shift.clock_out,
    totalHours: Math.round(totalHours * 100) / 100,
    isActive: !shift.clock_out,
    summary: {
      walkthroughs: walkthroughs?.length || 0,
      incidentsReported: incidents?.length || 0,
      ticketsCreated: ticketsCreated?.length || 0,
      ticketsAssigned: ticketsAssigned?.length || 0,
      messagesSent: messages?.length || 0,
      staffAssignments: staffAssignments?.length || 0,
      alertsTriggered: alerts?.length || 0,
      sopUploads: sopUploads?.length || 0,
    },
    details: {
      walkthroughs: walkthroughs || [],
      incidents: incidents || [],
      ticketsCreated: ticketsCreated || [],
      ticketsAssigned: ticketsAssigned || [],
      messages: messages || [],
      staffAssignments: staffAssignments || [],
      alerts: alerts || [],
      sopUploads: sopUploads || [],
    }
  }
}

export async function generateShiftReportCSV(report: any) {
  if (!report) return ""
  
  const lines: string[] = []
  
  // Header
  lines.push("Manager Shift Report")
  lines.push(`Manager: ${report.managerName}`)
  lines.push(`Clock In: ${new Date(report.clockIn).toLocaleString()}`)
  lines.push(`Clock Out: ${report.clockOut ? new Date(report.clockOut).toLocaleString() : "Active"}`)
  lines.push(`Total Hours: ${report.totalHours}`)
  lines.push("")
  
  // Summary
  lines.push("ACTIVITY SUMMARY")
  lines.push(`Walkthroughs Performed,${report.summary.walkthroughs}`)
  lines.push(`Incidents Reported,${report.summary.incidentsReported}`)
  lines.push(`Tickets Created,${report.summary.ticketsCreated}`)
  lines.push(`Tickets Assigned to Manager,${report.summary.ticketsAssigned}`)
  lines.push(`Messages Sent,${report.summary.messagesSent}`)
  lines.push(`Staff Assignments Made,${report.summary.staffAssignments}`)
  lines.push(`Alerts Triggered,${report.summary.alertsTriggered}`)
  lines.push(`SOP Documents Uploaded,${report.summary.sopUploads}`)
  lines.push("")
  
  // Details sections
  if (report.details.walkthroughs.length > 0) {
    lines.push("WALKTHROUGHS")
    lines.push("Type,Category,Completed At")
    report.details.walkthroughs.forEach((w: any) => {
      lines.push(`${w.walkthrough_type || ""},${w.category || ""},${new Date(w.completed_at).toLocaleString()}`)
    })
    lines.push("")
  }
  
  if (report.details.incidents.length > 0) {
    lines.push("INCIDENTS REPORTED")
    lines.push("Severity,Description,Location,Created At")
    report.details.incidents.forEach((i: any) => {
      lines.push(`${i.severity || ""},"${(i.description || "").replace(/"/g, '""')}",${i.location || ""},${new Date(i.created_at).toLocaleString()}`)
    })
    lines.push("")
  }
  
  if (report.details.ticketsCreated.length > 0) {
    lines.push("TICKETS CREATED")
    lines.push("Title,Priority,Status,Created At")
    report.details.ticketsCreated.forEach((t: any) => {
      lines.push(`"${(t.title || "").replace(/"/g, '""')}",${t.priority || ""},${t.status || ""},${new Date(t.created_at).toLocaleString()}`)
    })
    lines.push("")
  }
  
  if (report.details.messages.length > 0) {
    lines.push("MESSAGES SENT")
    lines.push("Content,Sent At")
    report.details.messages.forEach((m: any) => {
      lines.push(`"${(m.content || "").replace(/"/g, '""')}",${new Date(m.created_at).toLocaleString()}`)
    })
    lines.push("")
  }

  if (report.details.alerts.length > 0) {
    lines.push("ALERTS TRIGGERED")
    lines.push("Type,Message,Created At")
    report.details.alerts.forEach((a: any) => {
      lines.push(`${a.alert_type || ""},"${(a.message || "").replace(/"/g, '""')}",${new Date(a.created_at).toLocaleString()}`)
    })
    lines.push("")
  }

  if (report.details.sopUploads.length > 0) {
    lines.push("SOP DOCUMENTS UPLOADED")
    lines.push("Title,Category,File Name,Created At")
    report.details.sopUploads.forEach((s: any) => {
      lines.push(`"${(s.title || "").replace(/"/g, '""')}",${s.category || ""},${s.file_name || ""},${new Date(s.created_at).toLocaleString()}`)
    })
    lines.push("")
  }
  
  lines.push("END OF REPORT")
  
  return lines.join("\n")
}
