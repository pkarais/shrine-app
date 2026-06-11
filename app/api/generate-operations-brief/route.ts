import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/utils/supabase/server"
import { getTemplateScheduleForRange } from "@/lib/actions/schedule-template-week"
import {
  easternMonthBounds,
  easternDateRange,
  easternDayOfWeek,
  toEasternIso,
} from "@/lib/eastern-time"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    let { issueMonth, preparedBy } = body

    if (!issueMonth) {
      return NextResponse.json({ error: "issueMonth is required" }, { status: 400 })
    }

    // Normalize to YYYY-MM. The page passes "YYYY-MM-01" but historical
    // callers (and the RPC) expect just "YYYY-MM". Without this we built
    // strings like "2026-05-01-01" which parsed as Invalid Date and made
    // the entire shift-extrapolation block throw silently → fallback to
    // 17 raw clock-ins and a stale month label.
    issueMonth = String(issueMonth).slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(issueMonth)) {
      return NextResponse.json({ error: "issueMonth must be YYYY-MM" }, { status: 400 })
    }

    const admin = createAdminClient()

    // RPC expects a DATE — pass the first-of-month.
    const { data: issueId, error: rpcError } = await admin.rpc("generate_operations_brief_draft", {
      p_issue_month: `${issueMonth}-01`,
      p_prepared_by: preparedBy || null,
    })

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 })
    }

    const { data: issue, error: issueError } = await admin
      .from("operations_brief_issues")
      .select("*")
      .eq("id", issueId)
      .single()

    if (issueError) {
      return NextResponse.json({ error: issueError.message }, { status: 500 })
    }

    const { data: sections, error: sectionError } = await admin
      .from("operations_brief_sections")
      .select("*")
      .eq("issue_id", issueId)
      .order("section_order", { ascending: true })

    if (sectionError) {
      return NextResponse.json({ error: sectionError.message }, { status: 500 })
    }

    // Inject alerts activity section from manager_alerts_archive for this month
    try {
      const { start: alertsMonthStart } = easternMonthBounds(issueMonth)
      const monthStart = toEasternIso(alertsMonthStart, "00:00")
      const nextMonthDate = new Date(monthStart)
      nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1)
      const nextMonth = nextMonthDate.toISOString()

      const { data: archivedAlerts } = await admin
        .from("manager_alerts_archive")
        .select("alert_type, message, severity, triggered_by, metadata, acknowledged_at, original_created_at")
        .gte("original_created_at", monthStart)
        .lt("original_created_at", nextMonth)
        .order("original_created_at", { ascending: false })

      if (archivedAlerts && archivedAlerts.length > 0) {
        const alertCounts: Record<string, number> = {}
        for (const a of archivedAlerts) {
          alertCounts[a.alert_type] = (alertCounts[a.alert_type] || 0) + 1
        }
        const summaryLines = Object.entries(alertCounts)
          .map(([type, count]) => `${count}× ${type.replace(/_/g, " ")}`)
          .join(", ")

        const alertsContent = {
          total: archivedAlerts.length,
          by_type: alertCounts,
          items: archivedAlerts.slice(0, 30),
        }

        const { data: existingSection } = await admin
          .from("operations_brief_sections")
          .select("id")
          .eq("issue_id", issueId)
          .eq("section_key", "alerts_activity")
          .maybeSingle()

        if (!existingSection) {
          await admin.from("operations_brief_sections").insert({
            issue_id: issueId,
            section_key: "alerts_activity",
            section_title: "Staff Alert Activity",
            section_order: 35,
            content: alertsContent,
            markdown_body: `${archivedAlerts.length} manager alerts were acknowledged this month: ${summaryLines}.`,
          })
        }
      }
    } catch (alertErr) {
      console.warn("Failed to inject alerts section — brief still generated:", alertErr)
    }

    // Re-fetch sections to include alerts_activity if it was just inserted
    const { data: finalSections } = await admin
      .from("operations_brief_sections")
      .select("*")
      .eq("issue_id", issueId)
      .order("section_order", { ascending: true })

    // Enrich supplies_vendors_equipment section with real inventory data
    try {
      const [suppliesRes, vendorsRes, equipmentRes] = await Promise.all([
        admin.from("supplies").select("name, category, quantity, unit, reorder_threshold"),
        admin.from("vendors").select("id, name, category, active").eq("active", true),
        admin
          .from("equipment")
          .select("name, equipment_type, condition, next_maintenance, warranty_expiry")
          .in("condition", ["fair", "poor"]),
      ])

      const lowStock = (suppliesRes.data ?? []).filter(
        (s) => s.reorder_threshold != null && Number(s.quantity) <= Number(s.reorder_threshold)
      )
      const activeVendors = vendorsRes.data ?? []
      const attentionEquipment = equipmentRes.data ?? []

      const today = new Date()
      const inThirtyDays = new Date(today)
      inThirtyDays.setDate(today.getDate() + 30)

      const maintenanceSoon = attentionEquipment.filter((e) => {
        if (!e.next_maintenance) return false
        const d = new Date(e.next_maintenance)
        return d <= inThirtyDays
      })

      const lines: string[] = []
      if (lowStock.length > 0) {
        lines.push(
          `${lowStock.length} supply item${lowStock.length > 1 ? "s" : ""} at or below reorder threshold: ${lowStock.map((s) => `${s.name} (${s.quantity} ${s.unit})`).join(", ")}.`
        )
      } else {
        lines.push("All tracked supplies are above reorder thresholds.")
      }
      if (activeVendors.length > 0) {
        lines.push(`${activeVendors.length} active vendor${activeVendors.length > 1 ? "s" : ""} on file.`)
      }
      if (attentionEquipment.length > 0) {
        lines.push(
          `${attentionEquipment.length} equipment item${attentionEquipment.length > 1 ? "s" : ""} in fair or poor condition: ${attentionEquipment.map((e) => e.name).join(", ")}.`
        )
      }
      if (maintenanceSoon.length > 0) {
        lines.push(
          `${maintenanceSoon.length} item${maintenanceSoon.length > 1 ? "s" : ""} due for maintenance within 30 days: ${maintenanceSoon.map((e) => e.name).join(", ")}.`
        )
      }

      const inventoryContent = {
        low_stock: lowStock,
        active_vendors: activeVendors.length,
        attention_equipment: attentionEquipment,
        maintenance_due_soon: maintenanceSoon,
      }

      const { data: invSection } = await admin
        .from("operations_brief_sections")
        .select("id")
        .eq("issue_id", issueId)
        .eq("section_key", "supplies_vendors_equipment")
        .maybeSingle()

      if (invSection?.id) {
        await admin
          .from("operations_brief_sections")
          .update({
            content: inventoryContent,
            markdown_body: lines.join(" "),
            updated_at: new Date().toISOString(),
          })
          .eq("id", invSection.id)
      }
    } catch (invErr) {
      // Tables may not exist yet — brief still generates without inventory data
      console.warn("Failed to enrich inventory section:", invErr)
    }

    // ── Estimated completed shifts ─────────────────────────────────────
    // The shifts table only contains clock-in/out records, which are
    // sparse during pilot rollout. The manager wants the brief to
    // reflect coverage actually provided that month, derived from the
    // latest uploaded schedule snapshot (which already canonicalizes
    // names against staff_directory) plus calendar events.
    //
    // Formula:
    //   base   = sum over each day in month of (# staff scheduled with
    //            shiftStart && shiftEnd from the snapshot for that DOW).
    //            If the snapshot yields 0 for a day, fall back to the
    //            manager's baseline: Mon = 1 greeter + 1 porter + 1
    //            security (3); Tue–Sat = 1 greeter + 2 porters + 2
    //            security (5); Sun = 2 porters + 2 security (4).
    //   extra  = for each event NOT during 09:00–17:00 ET, add 2
    //            (1 porter + 1 security minimum to close the building)
    //            unless required_ops/security/greeter sum is higher.
    //   total  = base + extra
    let shiftDebug: any = null
    try {
      // Month bounds in Eastern Time — the church operates in NYC, all
      // dates the user sees on a wall calendar are ET. Never use UTC
      // midnight as the boundary or you cut off late events on the last
      // day and grab early events on the first day.
      const { start: monthStart, end: monthEnd } = easternMonthBounds(issueMonth)
      const monthStartUtc = toEasternIso(monthStart, "00:00")
      // Exclusive upper bound = midnight ET on first of next month.
      const nextMonthDate = new Date(toEasternIso(monthStart, "00:00"))
      nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1)
      const nextMonthUtc = nextMonthDate.toISOString()

      const { shiftsByDate, staffRoleMap, source: snapshotSource } =
        await getTemplateScheduleForRange(monthStart, monthEnd)

      // SALARIED STAFF — NOT counted in hourly payroll OR shift totals.
      // Paul (Director) and Marcus (Greeter) are both paid via salary,
      // not by the hour. They appear on the schedule so the team can
      // see when they're at the church, but they must not inflate the
      // "completed shifts" stat OR the bi-weekly payroll estimate.
      const SALARIED_FIRST_NAMES = new Set<string>(["paul", "marcus"])
      const DIRECTOR_NAMES = new Set<string>() // kept for footer label
      for (const [name, role] of Object.entries(staffRoleMap || {})) {
        if (String(role).toLowerCase() === "director") {
          DIRECTOR_NAMES.add(String(name).trim().toLowerCase())
        }
      }
      const isSalaried = (rawName: string) => {
        const nm = String(rawName || "").trim().toLowerCase()
        if (!nm) return false
        const first = nm.split(/\s+/)[0]
        return SALARIED_FIRST_NAMES.has(nm) || SALARIED_FIRST_NAMES.has(first)
      }
      const isDirector = isSalaried // legacy alias used below

      // No baseline floor. If the snapshot has zero people on a day,
      // the count is genuinely zero — we don't manufacture phantom
      // coverage. (Old BASELINE_PER_DOW removed at user request.)

      // Pay-rate lookup: name → hourly rate. Query staff_directory + the
      // most-recent staff_pay_rates row per person so we can attach a
      // dollar estimate to each projected shift.
      const nameToRate = new Map<string, number>()
      let avgRate = 0
      try {
        const { data: dirRows } = await admin
          .from("staff_directory")
          .select("id, name, profile_id")
          .not("name", "is", null)
        const lookupIds = new Set<string>()
        for (const r of dirRows || []) {
          if (r.id) lookupIds.add(r.id)
          if (r.profile_id) lookupIds.add(r.profile_id)
        }
        const { data: rateRows } = await admin
          .from("staff_pay_rates")
          .select("staff_id, hourly_rate, effective_date, created_at")
          .in("staff_id", Array.from(lookupIds))
          .order("effective_date", { ascending: false })
          .order("created_at", { ascending: false })
        const rateByStaffId = new Map<string, number>()
        for (const rr of rateRows || []) {
          if (!rateByStaffId.has(rr.staff_id)) {
            rateByStaffId.set(rr.staff_id, Number(rr.hourly_rate) || 0)
          }
        }
        const collectedRates: number[] = []
        for (const r of dirRows || []) {
          const nm = String(r.name || "").trim().toLowerCase()
          if (!nm) continue
          const rate =
            rateByStaffId.get(r.id) ||
            (r.profile_id ? rateByStaffId.get(r.profile_id) : 0) ||
            0
          if (rate > 0) {
            collectedRates.push(rate)
            if (!nameToRate.has(nm)) nameToRate.set(nm, rate)
            // Snapshot uses FIRST names ("Josh", "Demetri"). Directory
            // stores full names. Key by first-name token too so snapshot
            // hours actually find a rate.
            const first = nm.split(/\s+/)[0]
            if (first && first !== nm && !nameToRate.has(first)) {
              nameToRate.set(first, rate)
            }
          }
        }
        if (collectedRates.length > 0) {
          avgRate = collectedRates.reduce((a, b) => a + b, 0) / collectedRates.length
        }
      } catch {
        // Pay-rate lookup is best-effort; brief still generates.
      }

      const hoursBetween = (startHHMM?: string | null, endHHMM?: string | null): number => {
        if (!startHHMM || !endHHMM) return 0
        const [sh, sm] = startHHMM.split(":").map(Number)
        const [eh, em] = endHHMM.split(":").map(Number)
        if ([sh, sm, eh, em].some((n) => isNaN(n))) return 0
        let mins = eh * 60 + em - (sh * 60 + sm)
        if (mins < 0) mins += 24 * 60 // overnight
        return mins / 60
      }

      // Per-staff, per-workweek hour ledger. Workweek = Sunday→Saturday
      // (US standard). Overtime is calculated PER WEEK at 1.5× for any
      // hours over 40, then summed across the month. Bi-weekly payroll
      // still computes OT week-by-week (a 38h + 46h pay period owes 6h
      // of OT — the 6 hours over 40 in the 46h week).
      // staffName(lowercase) → weekStart → hours
      // The Director (Paul) IS counted in shift counts because he's
      // scheduled and present at the church those days, but his hours
      // are NOT added to this ledger — he's salaried separately and
      // does not factor into hourly payroll cost estimates.
      const weekStartFor = (dateISO: string): string => {
        // Workweek = Sunday→Saturday in Eastern Time.
        const dow = easternDayOfWeek(dateISO)
        const d = new Date(toEasternIso(dateISO, "12:00"))
        d.setUTCDate(d.getUTCDate() - dow)
        return d.toISOString().slice(0, 10)
      }
      const staffWeekHours = new Map<string, Map<string, number>>()
      const addStaffHours = (rawName: string, date: string, hrs: number) => {
        const key = String(rawName || "").trim().toLowerCase()
        if (!key || hrs <= 0) return
        if (isDirector(rawName)) return // salaried — excluded from hourly payroll
        const wk = weekStartFor(date)
        let weeks = staffWeekHours.get(key)
        if (!weeks) {
          weeks = new Map()
          staffWeekHours.set(key, weeks)
        }
        weeks.set(wk, (weeks.get(wk) || 0) + hrs)
      }

      let base = 0
      let daysWithoutCoverage = 0
      let unassignedHours = 0 // kept for type-stability; always 0 now
      // Iterate every calendar day in ET. We count ONLY actual scheduled
      // billable bodies — no baseline floor, no after-hours doubling.
      // Salaried staff (Paul, Marcus) are filtered out so they don't
      // inflate shift counts or hours.
      const dates: string[] = easternDateRange(monthStart, monthEnd)
      for (const date of dates) {
        const shifted = (shiftsByDate[date] || []).filter(
          (s) => s.shiftStart && s.shiftEnd,
        )
        const billable = shifted.filter((s) => !isSalaried(s.staffName))
        if (billable.length > 0) {
          base += billable.length
          for (const s of billable) {
            const hrs = hoursBetween(s.shiftStart, s.shiftEnd) || 8
            addStaffHours(s.staffName, date, hrs)
          }
        } else {
          daysWithoutCoverage += 1
        }
      }

      // After-hours events — informational count only. Whoever is
      // already on the schedule covers the event as part of their
      // normal shift; we do NOT add extra slots or extra hours.
      const { data: monthEvents } = await admin
        .from("events")
        .select("title, start_time, end_time, required_ops, required_security, required_greeter")
        .gte("start_time", monthStartUtc)
        .lt("start_time", nextMonthUtc)

      const extra = 0
      let afterHoursEventCount = 0
      const afterHoursHours = 0
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        hour: "2-digit",
        hour12: false,
      })
      for (const ev of monthEvents || []) {
        if (!ev.start_time) continue
        if (ev.title === "Staff Operational Window" || ev.title === "Open for Tourism") continue
        const startHourStr = fmt.format(new Date(ev.start_time))
        const startHour = parseInt(startHourStr, 10)
        const isAfterHours = isNaN(startHour) ? false : startHour < 9 || startHour >= 17
        if (!isAfterHours) continue
        afterHoursEventCount += 1
      }

      const extrapolatedShifts = base + extra
      const baselineDaysUsed = 0

      // ── Per-week OT calculation ──
      // For each named staff member, sum their hours per workweek.
      // Anything ≤40h is straight time, anything over is 1.5× their rate.
      // Workweeks that fall partly outside the month still count their
      // in-month hours toward that week's bucket (this slightly under-
      // counts OT at month boundaries but is a reasonable estimate).
      let regHours = 0
      let otHours = 0
      let staffCost = 0
      const perStaffSummary: Array<{
        name: string
        hours: number
        ot_hours: number
        rate: number
        cost: number
      }> = []
      for (const [nameKey, weeks] of Array.from(staffWeekHours.entries())) {
        const rate = nameToRate.get(nameKey) || avgRate
        let personHours = 0
        let personOt = 0
        let personCost = 0
        for (const hrs of Array.from(weeks.values())) {
          const reg = Math.min(40, hrs)
          const ot = Math.max(0, hrs - 40)
          personHours += hrs
          personOt += ot
          personCost += reg * rate + ot * rate * 1.5
        }
        regHours += personHours - personOt
        otHours += personOt
        staffCost += personCost
        perStaffSummary.push({
          name: nameKey,
          hours: Math.round(personHours * 10) / 10,
          ot_hours: Math.round(personOt * 10) / 10,
          rate: Math.round(rate * 100) / 100,
          cost: Math.round(personCost * 100) / 100,
        })
      }
      // Unassigned (baseline + after-hours coverage) — straight time at
      // workforce avg rate, since we don't know who works those slots.
      const unassignedCost = unassignedHours * avgRate

      const totalHours = regHours + otHours + unassignedHours
      const totalCost = staffCost + unassignedCost
      const estimatedPayrollCost = Math.round(totalCost * 100) / 100
      const estimatedHours = Math.round(totalHours * 10) / 10

      // The shifts table only contains clock-in/out records during pilot
      // rollout — it is intentionally sparse and unreliable. The manager
      // wants the brief to reflect the projected coverage (snapshot
      // repeated across the month + after-hours event extras), with
      // actuals shown only as supplemental info. We always use the
      // extrapolated total unless the snapshot path produced zero.
      const { count: actualShiftCount } = await admin
        .from("shifts")
        .select("id", { count: "exact", head: true })
        .gte("clock_in", monthStartUtc)
        .lt("clock_in", nextMonthUtc)
        .not("clock_out", "is", null)

      const actual = actualShiftCount || 0
      const useActual = extrapolatedShifts === 0 && actual > 0
      const estimatedShifts = useActual ? actual : extrapolatedShifts
      const shiftSource = useActual ? "actual_clock_in_out" : "extrapolated_from_snapshot"

      shiftDebug = {
        source: shiftSource,
        actual_clock_in_out: actual,
        extrapolated_total: extrapolatedShifts,
        scheduled_from_snapshot: base,
        after_hours_event_coverage: extra,
        after_hours_event_count: afterHoursEventCount,
        days_in_month: dates.length,
        baseline_days_used: baselineDaysUsed,
        snapshot_source: snapshotSource,
        chosen_total: estimatedShifts,
        estimated_hours: estimatedHours,
        estimated_payroll_cost: estimatedPayrollCost,
        regular_hours: Math.round(regHours * 10) / 10,
        overtime_hours: Math.round(otHours * 10) / 10,
        unassigned_coverage_hours: Math.round(unassignedHours * 10) / 10,
        overtime_cost_premium: Math.round(otHours * 0.5 * avgRate * 100) / 100,
        workforce_avg_hourly_rate: Math.round(avgRate * 100) / 100,
        staff_with_rates: nameToRate.size,
        director_excluded_from_payroll: Array.from(DIRECTOR_NAMES),
        per_staff: perStaffSummary,
      }

      // Patch the at_a_glance section
      const { data: glanceSection, error: glanceErr } = await admin
        .from("operations_brief_sections")
        .select("id, content, markdown_body")
        .eq("issue_id", issueId)
        .eq("section_key", "at_a_glance")
        .maybeSingle()
      if (glanceErr) shiftDebug.glance_select_error = glanceErr.message

      if (glanceSection?.id) {
        const newContent = {
          ...(glanceSection.content as Record<string, unknown> || {}),
          completed_shifts: estimatedShifts,
          estimated_hours: estimatedHours,
          estimated_payroll_cost: estimatedPayrollCost,
          completed_shifts_breakdown: shiftDebug,
        }
        const eventsSupported = (newContent as any).events_supported ?? 0
        const openingW = (newContent as any).opening_walkthroughs ?? 0
        const closingW = (newContent as any).closing_walkthroughs ?? 0
        const ticketsResolved = (newContent as any).tickets_resolved ?? 0
        const payrollStr = estimatedPayrollCost > 0
          ? ` Estimated payroll cost: $${estimatedPayrollCost.toLocaleString()} across ~${estimatedHours} hours.`
          : ""
        const newMarkdown =
          `This month included ${eventsSupported} events, ${estimatedShifts} completed shifts, ` +
          `${openingW + closingW} walkthrough submissions, and ${ticketsResolved} resolved maintenance tickets.` +
          payrollStr

        const { error: glanceUpdErr } = await admin
          .from("operations_brief_sections")
          .update({
            content: newContent,
            markdown_body: newMarkdown,
            updated_at: new Date().toISOString(),
          })
          .eq("id", glanceSection.id)
        if (glanceUpdErr) shiftDebug.glance_update_error = glanceUpdErr.message
      } else {
        shiftDebug.glance_section_missing = true
      }

      // Patch the issue.content.metrics.completed_shifts as well so the
      // hero stat cards reflect the same estimate.
      const { data: issueRow, error: issueErr } = await admin
        .from("operations_brief_issues")
        .select("content")
        .eq("id", issueId)
        .maybeSingle()
      if (issueErr) shiftDebug.issue_select_error = issueErr.message

      if (issueRow?.content) {
        const ic = issueRow.content as Record<string, any>
        const newIssueContent = {
          ...ic,
          metrics: {
            ...(ic.metrics || {}),
            completed_shifts: estimatedShifts,
            estimated_hours: estimatedHours,
            estimated_payroll_cost: estimatedPayrollCost,
            completed_shifts_breakdown: shiftDebug,
          },
        }
        const { error: issueUpdErr } = await admin
          .from("operations_brief_issues")
          .update({ content: newIssueContent, updated_at: new Date().toISOString() })
          .eq("id", issueId)
        if (issueUpdErr) shiftDebug.issue_update_error = issueUpdErr.message
      } else {
        shiftDebug.issue_content_missing = true
      }
    } catch (shiftErr: any) {
      console.error("Failed to compute estimated completed shifts:", shiftErr)
      shiftDebug = { error: shiftErr?.message || String(shiftErr) }
    }

    // ── Generate readable prose for content-driven sections ──
    // The SQL stored proc seeds each section with placeholder copy and a
    // structured `content` JSON. Until now the brief rendered that JSON
    // as a raw <pre> block. Here we walk the content for each known
    // section and produce real markdown_body summaries so the published
    // brief reads like a narrative report instead of a debug dump.
    try {
      const { data: enrichableSections } = await admin
        .from("operations_brief_sections")
        .select("id, section_key, content, markdown_body")
        .eq("issue_id", issueId)

      const fmtDate = (s?: string | null) => {
        if (!s) return ""
        try {
          return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" })
        } catch { return "" }
      }

      for (const sec of enrichableSections || []) {
        const c = (sec.content || {}) as any
        let md: string | null = null

        if (sec.section_key === "facilities_maintenance") {
          const items: any[] = Array.isArray(c.items) ? c.items : []
          if (items.length === 0) {
            md = "No maintenance tickets were created or resolved during this period."
          } else {
            const resolved = items.filter((i) => i.resolved_at)
            const open = items.filter((i) => !i.resolved_at)
            const byPriority = items.reduce((acc: Record<string, number>, i) => {
              const p = (i.priority || "normal").toLowerCase()
              acc[p] = (acc[p] || 0) + 1
              return acc
            }, {})
            const priorityLine = Object.entries(byPriority)
              .map(([p, n]) => `${n} ${p}`).join(", ")
            const recent = items.slice(0, 5).map((i) => {
              const status = i.resolved_at ? `resolved ${fmtDate(i.resolved_at)}` : `opened ${fmtDate(i.created_at)}`
              return `• ${i.title || "Untitled ticket"} — ${i.priority || "normal"} priority (${status})`
            }).join("\n")
            md = `${items.length} maintenance ticket${items.length === 1 ? "" : "s"} were active this month (${resolved.length} resolved, ${open.length} still open). Priority mix: ${priorityLine}.\n\nRecent activity:\n${recent}`
          }
        }

        else if (sec.section_key === "security_safety") {
          const incidents: any[] = Array.isArray(c.incidents) ? c.incidents : []
          if (incidents.length === 0) {
            md = "No incidents were reported this month. The team maintained a clean safety record across all walkthroughs and shifts."
          } else {
            const bySeverity = incidents.reduce((acc: Record<string, number>, i) => {
              const s = (i.severity || "low").toLowerCase()
              acc[s] = (acc[s] || 0) + 1
              return acc
            }, {})
            const sevLine = Object.entries(bySeverity).map(([s, n]) => `${n} ${s}`).join(", ")
            const recent = incidents.slice(0, 5).map((i) => {
              const date = fmtDate(i.incident_date)
              const types = Array.isArray(i.incident_types) ? i.incident_types.join(", ") : (i.incident_types || "incident")
              return `• ${date} — ${i.location || "unspecified location"}: ${types} (${i.severity || "low"} severity)`
            }).join("\n")
            md = `${incidents.length} incident${incidents.length === 1 ? "" : "s"} were logged this month (${sevLine}).\n\nRecent reports:\n${recent}`
          }
        }

        else if (sec.section_key === "event_readiness") {
          const events: any[] = Array.isArray(c.events) ? c.events : []
          if (events.length === 0) {
            md = "No events were scheduled this month."
          } else {
            const byCategory = events.reduce((acc: Record<string, number>, e) => {
              const cat = (e.category || "general").toLowerCase()
              acc[cat] = (acc[cat] || 0) + 1
              return acc
            }, {})
            const catLine = Object.entries(byCategory).map(([cat, n]) => `${n} ${cat}`).join(", ")
            const totalOps = events.reduce((sum, e) => sum + (Number(e.required_ops) || 0), 0)
            const totalSec = events.reduce((sum, e) => sum + (Number(e.required_security) || 0), 0)
            const totalGreet = events.reduce((sum, e) => sum + (Number(e.required_greeter) || 0), 0)
            const upcoming = events.slice(0, 5).map((e) => `• ${fmtDate(e.start_time)} — ${e.title || "Untitled event"} (${e.category || "general"})`).join("\n")
            md = `${events.length} event${events.length === 1 ? "" : "s"} were on the calendar this month: ${catLine}. Coverage requirements totalled ${totalOps} ops, ${totalSec} security, and ${totalGreet} greeter assignments.\n\nHighlights:\n${upcoming}`
          }
        }

        else if (sec.section_key === "recognition_badges") {
          const badges: any[] = Array.isArray(c.badges) ? c.badges : []
          if (badges.length === 0) {
            md = "No new badges were awarded this month."
          } else {
            const byPerson = badges.reduce((acc: Record<string, number>, b) => {
              const name = b.full_name || "Unknown"
              acc[name] = (acc[name] || 0) + 1
              return acc
            }, {})
            const topRecipients = Object.entries(byPerson)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .slice(0, 5)
              .map(([name, n]) => `${name} (${n})`).join(", ")
            const recent = badges.slice(0, 5).map((b) => {
              const level = b.badge_level ? ` ${b.badge_level}` : ""
              return `• ${b.full_name || "Staff"} earned ${b.badge_name}${level}${b.reason ? ` — ${b.reason}` : ""}`
            }).join("\n")
            md = `${badges.length} badge${badges.length === 1 ? "" : "s"} were awarded this month. Top recipients: ${topRecipients}.\n\nRecent awards:\n${recent}`
          }
        }

        else if (sec.section_key === "leaderboard") {
          const top: any[] = Array.isArray(c.top_5) ? c.top_5 : []
          if (top.length === 0) {
            md = "Leaderboard data is not yet available for this month."
          } else {
            const lines = top.map((r) => `${r.rank}. ${r.display_name || "Staff"} — ${r.total_points || 0} pts (${r.badges_earned || 0} badges, ${r.walkthroughs_completed || 0} walkthroughs, ${r.on_time_count || 0} on-time)`).join("\n")
            md = `This month's top performers by recognition points:\n${lines}`
          }
        }

        else if (sec.section_key === "next_month_priorities") {
          const items: any[] = Array.isArray(c.priorities) ? c.priorities : []
          if (items.length > 0) {
            md = `Looking ahead, the team should focus on:\n${items.map((p) => `• ${p}`).join("\n")}`
          }
        }

        else if (sec.section_key === "staff_reminders") {
          const types: any[] = Array.isArray(c.reminder_types) ? c.reminder_types : []
          if (types.length > 0) {
            md = `Staff are encouraged to configure the following reminders in the Operations App to stay punctual, complete checklists on time, and avoid avoidable warnings. Each reminder displays a visible toast in addition to its audio cue, so notifications remain useful even when phones are muted or paired with Bluetooth.\n\nRecommended reminder types:\n${types.map((t) => `• ${t}`).join("\n")}`
          }
        }

        if (md) {
          await admin
            .from("operations_brief_sections")
            .update({ markdown_body: md, updated_at: new Date().toISOString() })
            .eq("id", sec.id)
        }
      }
    } catch (enrichErr: any) {
      console.error("Failed to enrich brief sections:", enrichErr)
    }

    // Final fetch includes all enriched sections
    const { data: enrichedSections } = await admin
      .from("operations_brief_sections")
      .select("*")
      .eq("issue_id", issueId)
      .order("section_order", { ascending: true })

    const { data: finalIssue } = await admin
      .from("operations_brief_issues")
      .select("*")
      .eq("id", issueId)
      .single()

    return NextResponse.json({
      issue: finalIssue ?? issue,
      sections: enrichedSections ?? finalSections ?? sections ?? [],
      shiftDebug,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
