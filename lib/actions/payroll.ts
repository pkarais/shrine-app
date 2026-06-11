"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { requireManager } from "./auth-helpers"
import {
  toEasternIso,
  easternDayOfWeek,
  easternDateRange,
  easternDate,
} from "@/lib/eastern-time"

// ─── Pay Period Math ───

export type PayPeriod = {
  start: Date
  end: Date
  label: string
  periodNumber: number // 1 or 2
}

export async function getPayPeriod(dateInput: Date | string): Promise<PayPeriod> {
  const d = typeof dateInput === "string" ? new Date(dateInput) : new Date(dateInput)
  // Extract year/month/day in Eastern Time — the server runs UTC on Vercel,
  // so getFullYear/getMonth/getDate would give the wrong day near midnight ET.
  const etDateStr = easternDate(d.toISOString()) // "YYYY-MM-DD"
  const [year, month1, day] = etDateStr.split("-").map(Number)
  const month = month1 - 1 // 0-indexed for Date constructor

  if (day <= 15) {
    const start = new Date(toEasternIso(`${year}-${String(month1).padStart(2, "0")}-01`, "00:00"))
    const end = new Date(toEasternIso(`${year}-${String(month1).padStart(2, "0")}-15`, "23:59"))
    return { start, end, label: `${start.toLocaleDateString("en-US", { month: "long", timeZone: "America/New_York" })} 1–15, ${year}`, periodNumber: 1 }
  } else {
    const lastDay = new Date(year, month + 1, 0).getDate() // pure calendar math — safe
    const start = new Date(toEasternIso(`${year}-${String(month1).padStart(2, "0")}-16`, "00:00"))
    const end = new Date(toEasternIso(`${year}-${String(month1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`, "23:59"))
    return { start, end, label: `${start.toLocaleDateString("en-US", { month: "long", timeZone: "America/New_York" })} 16–${lastDay}, ${year}`, periodNumber: 2 }
  }
}

export async function getPreviousPayPeriod(dateInput: Date | string): Promise<PayPeriod> {
  const current = await getPayPeriod(dateInput)
  const d = new Date(current.start)
  d.setDate(d.getDate() - 1)
  return getPayPeriod(d)
}

export async function getNextPayPeriod(dateInput: Date | string): Promise<PayPeriod> {
  const current = await getPayPeriod(dateInput)
  const d = new Date(current.end)
  d.setDate(d.getDate() + 1)
  return getPayPeriod(d)
}

// ─── Types ───

export type DailyHours = {
  date: string
  hours: number
  shifts: number
}

export type StaffPayrollRow = {
  staffId: string
  profileId: string | null
  name: string
  role: string
  hourlyRate: number
  dailyHours: DailyHours[]
  totalHours: number
  grossPay: number
}

export type PayrollReportData = {
  period: PayPeriod
  staffRows: StaffPayrollRow[]
  grandTotalHours: number
  grandTotalPay: number
  generatedAt: string
}

// ─── Pay Rates ───

export async function getStaffPayRates() {
  const admin = createAdminClient()
  
  // Fetch latest rate rows first and dedupe by staff_id so the UI shows the current rate.
  const { data: rates, error: ratesError } = await admin
    .from("staff_pay_rates")
    .select("*")
    .order("effective_date", { ascending: false })
    .order("created_at", { ascending: false })
  
  if (ratesError) throw new Error(ratesError.message)
  
  const { data: staff } = await admin
    .from("staff_directory")
    .select("id, name, role, profile_id")
  
  const staffById = new Map((staff || []).map(s => [s.id, s]))
  const staffByProfileId = new Map((staff || []).filter((s) => s.profile_id).map((s) => [s.profile_id as string, s]))
  const latestRates: any[] = []
  const seenStaff = new Set<string>()

  for (const rate of (rates || [])) {
    if (!seenStaff.has(rate.staff_id)) {
      seenStaff.add(rate.staff_id)
      latestRates.push(rate)
    }
  }
  
  return latestRates.map((r: any) => {
    const directoryMatch = staffById.get(r.staff_id) || staffByProfileId.get(r.staff_id)
    return {
      ...r,
      staff_directory: directoryMatch || {
        id: r.staff_id,
        profile_id: r.staff_id,
        name: `Unknown staff (${String(r.staff_id).slice(0, 8)})`,
        role: r.role || "staff",
      },
    }
  })
}

export async function getCurrentPayRate(staffId: string): Promise<number> {
  const admin = createAdminClient()
  const { data: directoryEntry, error: directoryError } = await admin
    .from("staff_directory")
    .select("profile_id")
    .eq("id", staffId)
    .maybeSingle()

  if (directoryError) throw new Error(directoryError.message)

  const lookupIds = [staffId]
  if (directoryEntry?.profile_id) lookupIds.push(directoryEntry.profile_id)

  const { data, error } = await admin
    .from("staff_pay_rates")
    .select("hourly_rate")
    .in("staff_id", lookupIds)
    .order("effective_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data?.hourly_rate ? Number(data.hourly_rate) : 0
}

export async function savePayRate(
  staffId: string,
  hourlyRate: number,
  role: string,
  notes?: string,
  existingRateId?: string,
) {
  await requireManager()
  const admin = createAdminClient()

  if (existingRateId) {
    const { error } = await admin
      .from("staff_pay_rates")
      .update({ staff_id: staffId, hourly_rate: hourlyRate, role, notes, updated_at: new Date().toISOString() })
      .eq("id", existingRateId)
    if (error) throw new Error(error.message)
  } else {
    const { data: directoryEntry } = await admin
      .from("staff_directory")
      .select("profile_id")
      .eq("id", staffId)
      .maybeSingle()

    const lookupIds = [staffId]
    if (directoryEntry?.profile_id) lookupIds.push(directoryEntry.profile_id)

    const { data: existing } = await admin
      .from("staff_pay_rates")
      .select("id")
      .in("staff_id", lookupIds)
      .order("effective_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      const { error } = await admin
        .from("staff_pay_rates")
        .update({ staff_id: staffId, hourly_rate: hourlyRate, role, notes, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await admin.from("staff_pay_rates").insert({
        staff_id: staffId,
        hourly_rate: hourlyRate,
        role,
        notes: notes || null,
      })
      if (error) throw new Error(error.message)
    }
  }

  revalidatePath("/manager/payroll")
  return { success: true }
}

// ─── Payroll Calculation ───

export async function generatePayrollData(periodStart: Date, periodEnd: Date): Promise<PayrollReportData> {
  const admin = createAdminClient()
  const startIso = periodStart.toISOString()
  const endIso = periodEnd.toISOString()

  // 1. Get all shifts in the period
  const { data: shifts, error: shiftsError } = await admin
    .from("shifts")
    .select("id, user_id, clock_in, clock_out")
    .gte("clock_in", startIso)
    .lte("clock_in", endIso)
    .not("clock_out", "is", null)

  if (shiftsError) throw new Error(shiftsError.message)
  if (!shifts || shifts.length === 0) {
    return {
      period: await getPayPeriod(periodStart),
      staffRows: [],
      grandTotalHours: 0,
      grandTotalPay: 0,
      generatedAt: new Date().toISOString(),
    }
  }

  // 2. Get all breaks for those shifts
  const shiftIds = shifts.map(s => s.id)
  const { data: breaks, error: breaksError } = await admin
    .from("breaks")
    .select("shift_id, break_start, break_end")
    .in("shift_id", shiftIds)
    .not("break_end", "is", null)

  if (breaksError) throw new Error(breaksError.message)

  // 3. Group breaks by shift
  const breaksByShift: Record<string, { start: Date; end: Date }[]> = {}
  for (const b of breaks || []) {
    if (!breaksByShift[b.shift_id]) breaksByShift[b.shift_id] = []
    breaksByShift[b.shift_id].push({ start: new Date(b.break_start), end: new Date(b.break_end) })
  }

  // 4. Calculate hours per shift
  type ShiftCalc = { userId: string; date: string; paidHours: number }
  const shiftCalcs: ShiftCalc[] = []

  for (const shift of shifts) {
    const clockIn = new Date(shift.clock_in)
    const clockOut = new Date(shift.clock_out!)
    const totalMs = clockOut.getTime() - clockIn.getTime()

    const breakList = breaksByShift[shift.id] || []
    let breakMs = 0
    for (const b of breakList) {
      breakMs += b.end.getTime() - b.start.getTime()
    }

    const paidMs = Math.max(0, totalMs - breakMs)
    const paidHours = Math.round((paidMs / (1000 * 60 * 60)) * 100) / 100

    // Use Eastern Time date — after 8 PM ET the UTC date rolls to the next day.
    const dateStr = easternDate(clockIn.toISOString())
    shiftCalcs.push({ userId: shift.user_id, date: dateStr, paidHours })
  }

  // 5. Get staff directory + profiles for names
  const userIds = Array.from(new Set(shiftCalcs.map(s => s.userId)))
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, role")
    .in("id", userIds)

  const { data: staffDir } = await admin
    .from("staff_directory")
    .select("id, profile_id, name, role")

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  const staffDirByProfileId = new Map((staffDir || [])
    .filter((s) => s.profile_id)
    .map((s) => [s.profile_id as string, s]))
  const staffDirByName = new Map((staffDir || [])
    .filter((s) => s.name)
    .map((s) => [s.name!.toLowerCase(), s]))

  const findStaffDirectoryForProfile = (profile: any) => {
    if (!profile) return undefined
    const exactByProfile = staffDirByProfileId.get(profile.id)
    if (exactByProfile) return exactByProfile

    const fullName = (profile.full_name || "").trim().toLowerCase()
    if (!fullName) return undefined

    const exactByName = staffDirByName.get(fullName)
    if (exactByName) return exactByName

    const firstName = fullName.split(" ")[0]
    const prefixMatches = (staffDir || []).filter((s) => {
      const name = s.name?.toLowerCase() || ""
      return name === firstName || name.startsWith(`${firstName} `)
    })
    return prefixMatches.length === 1 ? prefixMatches[0] : undefined
  }

  // 6. Get pay rates
  const staffDirIds = (staffDir || []).map((s) => s.id)
  const staffProfileIds = (staffDir || []).filter((s) => s.profile_id).map((s) => s.profile_id as string)
  const queryIds = Array.from(new Set([...staffDirIds, ...staffProfileIds, ...userIds]))
  const { data: rates } = await admin
    .from("staff_pay_rates")
    .select("staff_id, hourly_rate")
    .in("staff_id", queryIds)
    .order("effective_date", { ascending: false })
    .order("created_at", { ascending: false })

  const rateMap = new Map<string, number>()
  for (const rate of (rates || [])) {
    if (!rateMap.has(rate.staff_id)) {
      rateMap.set(rate.staff_id, Number(rate.hourly_rate))
    }
  }

  // 7. Build all days in period (Eastern Time dates — avoids UTC midnight rollover)
  const periodStartEt = easternDate(periodStart.toISOString())
  const periodEndEt = easternDate(periodEnd.toISOString())
  const allDays: string[] = easternDateRange(periodStartEt, periodEndEt)

  // 8. Build rows per staff member
  const staffRows: StaffPayrollRow[] = []
  for (const userId of userIds) {
    const profile = profileMap.get(userId)
    const staff = profile ? findStaffDirectoryForProfile(profile) : undefined
    const name = profile?.full_name || staff?.name || `User ${userId.slice(0, 8)}`
    const role = profile?.role || staff?.role || "staff"
    const staffId = staff?.id || ""
    const hourlyRate = rateMap.get(staffId) ?? rateMap.get(userId) ?? 0

    const userShifts = shiftCalcs.filter(s => s.userId === userId)
    const hoursByDate: Record<string, number> = {}
    for (const s of userShifts) {
      hoursByDate[s.date] = (hoursByDate[s.date] || 0) + s.paidHours
    }

    const dailyHours: DailyHours[] = allDays.map(date => ({
      date,
      hours: Math.round((hoursByDate[date] || 0) * 100) / 100,
      shifts: userShifts.filter(s => s.date === date).length,
    }))

    const totalHours = Math.round(dailyHours.reduce((sum, d) => sum + d.hours, 0) * 100) / 100
    const grossPay = Math.round(totalHours * hourlyRate * 100) / 100

    staffRows.push({
      staffId,
      profileId: userId,
      name,
      role,
      hourlyRate,
      dailyHours,
      totalHours,
      grossPay,
    })
  }

  // Sort by name
  staffRows.sort((a, b) => a.name.localeCompare(b.name))

  const grandTotalHours = Math.round(staffRows.reduce((s, r) => s + r.totalHours, 0) * 100) / 100
  const grandTotalPay = Math.round(staffRows.reduce((s, r) => s + r.grossPay, 0) * 100) / 100

  return {
    period: await getPayPeriod(periodStart),
    staffRows,
    grandTotalHours,
    grandTotalPay,
    generatedAt: new Date().toISOString(),
  }
}

// ─── Archive / CRUD ───

export async function archivePayrollReport(data: PayrollReportData) {
  await requireManager()
  const admin = createAdminClient()

  const { data: { user } } = await createServerClient().auth.getUser()
  const profile = user
    ? (await admin.from("profiles").select("full_name").eq("id", user.id).single()).data
    : null

  const slugBase = `payroll-${data.period.start.toISOString().slice(0, 10)}-${data.period.end.toISOString().slice(0, 10)}`
  let slug = slugBase
  let suffix = 1

  while (true) {
    const { data: existing } = await admin.from("payroll_reports").select("id").eq("slug", slug).maybeSingle()
    if (!existing) break
    slug = `${slugBase}-${suffix}`
    suffix++
  }

  // Roll up daily briefs for this payroll period so the archived
  // bi-weekly report carries the same headline metrics the manager saw
  // each day (visitors, walkthroughs, incidents, events).
  let dailyRollup: any = null
  try {
    const { aggregateDailyBriefsForPeriod } = await import("@/lib/actions/visitor-rollups")
    dailyRollup = await aggregateDailyBriefsForPeriod(
      data.period.start.toISOString().slice(0, 10),
      data.period.end.toISOString().slice(0, 10),
    )
  } catch (e: any) {
    console.warn("daily brief rollup skipped:", e?.message || e)
  }

  const { error } = await admin.from("payroll_reports").insert({
    period_start: data.period.start.toISOString().slice(0, 10),
    period_end: data.period.end.toISOString().slice(0, 10),
    title: `Payroll Report — ${data.period.label}`,
    slug,
    status: "draft",
    content: { ...(data as any), daily_rollup: dailyRollup } as any,
    prepared_by: user?.id || null,
    prepared_by_name: profile?.full_name || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath("/payroll/archive")
  return { success: true, slug }
}

export async function getArchivedPayrollReports() {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("payroll_reports")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("payroll_reports table may not exist yet:", error.message)
      return []
    }
    return data || []
  } catch {
    return []
  }
}

export async function getPayrollReportBySlug(slug: string) {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from("payroll_reports")
      .select("*")
      .eq("slug", slug)
      .single()

    if (error || !data) return null
    return data
  } catch {
    return null
  }
}

export async function updatePayrollReportStatus(reportId: string, status: "draft" | "published" | "archived") {
  await requireManager()
  const admin = createAdminClient()
  const updates: Record<string, any> = { status, updated_at: new Date().toISOString() }
  if (status === "published") updates.published_at = new Date().toISOString()

  const { error } = await admin.from("payroll_reports").update(updates).eq("id", reportId)
  if (error) throw new Error(error.message)
  revalidatePath("/payroll/archive")
  return { success: true }
}

export async function deletePayrollReport(reportId: string) {
  await requireManager()
  const admin = createAdminClient()
  const { error } = await admin.from("payroll_reports").delete().eq("id", reportId)
  if (error) throw new Error(error.message)
  revalidatePath("/payroll/archive")
  return { success: true }
}

// ─── HTML Generation ───

export async function generatePayrollHtml(data: PayrollReportData): Promise<string> {
  const dayHeaders = data.staffRows[0]?.dailyHours.map(d => {
    const date = new Date(d.date + "T12:00:00")
    return `<th style="padding:8px 4px;font-size:11px;text-align:center;border-bottom:2px solid #1a3a5c;background:#f8f9fa;">${date.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })}</th>`
  }).join("") || ""

  const rows = data.staffRows.map(row => {
    const dayCells = row.dailyHours.map(d =>
      `<td style="padding:6px 4px;text-align:center;font-size:12px;border-bottom:1px solid #e9ecef;">${d.hours > 0 ? d.hours.toFixed(2) : "—"}</td>`
    ).join("")

    return `
      <tr>
        <td style="padding:6px 8px;font-weight:600;font-size:12px;border-bottom:1px solid #e9ecef;white-space:nowrap;">${row.name}</td>
        <td style="padding:6px 8px;font-size:11px;text-transform:uppercase;color:#666;border-bottom:1px solid #e9ecef;">${row.role}</td>
        <td style="padding:6px 8px;text-align:right;font-size:12px;border-bottom:1px solid #e9ecef;">$${row.hourlyRate.toFixed(2)}</td>
        ${dayCells}
        <td style="padding:6px 8px;text-align:right;font-weight:700;font-size:12px;border-bottom:1px solid #e9ecef;background:#f8f9fa;">${row.totalHours.toFixed(2)}</td>
        <td style="padding:6px 8px;text-align:right;font-weight:700;font-size:12px;border-bottom:1px solid #e9ecef;background:#f8f9fa;">$${row.grossPay.toFixed(2)}</td>
      </tr>
    `
  }).join("")

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Payroll Report — ${data.period.label}</title>
<style>
  @page { size: landscape; margin: 0.5in; }
  body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 0; color: #1a1a1a; line-height: 1.4; }
  h1 { font-size: 1.6rem; border-bottom: 3px solid #1a3a5c; padding-bottom: 0.5rem; margin-bottom: 0.5rem; }
  .meta { color: #666; font-size: 0.8rem; margin-bottom: 1rem; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .summary { display: flex; gap: 1rem; margin: 1rem 0; }
  .summary-box { background: #f5f5f5; border-radius: 6px; padding: 0.75rem 1rem; text-align: center; flex: 1; }
  .summary-label { font-size: 0.6rem; text-transform: uppercase; color: #666; font-weight: 700; }
  .summary-value { font-size: 1.2rem; font-weight: 900; }
  footer { margin-top: 2rem; border-top: 1px solid #e0e0e0; padding-top: 1rem; font-size: 0.7rem; color: #666; text-align: center; }
</style></head>
<body>
  <div class="meta">${data.period.label} &bull; Generated ${new Date(data.generatedAt).toLocaleString()}</div>
  <h1>Payroll Report — ${data.period.label}</h1>
  <div class="summary">
    <div class="summary-box">
      <div class="summary-label">Staff Members</div>
      <div class="summary-value">${data.staffRows.length}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Total Hours</div>
      <div class="summary-value">${data.grandTotalHours.toFixed(2)}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Total Payroll</div>
      <div class="summary-value">$${data.grandTotalPay.toFixed(2)}</div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="padding:8px;text-align:left;border-bottom:2px solid #1a3a5c;background:#f8f9fa;">Staff</th>
        <th style="padding:8px;text-align:left;border-bottom:2px solid #1a3a5c;background:#f8f9fa;">Role</th>
        <th style="padding:8px;text-align:right;border-bottom:2px solid #1a3a5c;background:#f8f9fa;">Rate</th>
        ${dayHeaders}
        <th style="padding:8px;text-align:right;border-bottom:2px solid #1a3a5c;background:#f8f9fa;">Total Hrs</th>
        <th style="padding:8px;text-align:right;border-bottom:2px solid #1a3a5c;background:#f8f9fa;">Gross Pay</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <footer>
    <p><strong>Shrine Operations Payroll Report</strong></p>
    <p>Source of Truth: Operations App &bull; Supabase Records &bull; Pay periods: 1st–15th and 16th–end of month</p>
  </footer>
</body></html>`
}

// ─── Bi-Weekly Payroll Estimate ─────────────────────────────────────
// Projects expected payroll cost for a date range from the latest
// schedule snapshot. Counts ONLY actual scheduled billable bodies —
// no baseline floor, no after-hours doubling. Salaried staff (Paul,
// Marcus) are excluded entirely from shifts, hours, and cost.
// Computes per-week overtime (>40h = 1.5×) per workweek (Sun–Sat ET).

export type BiWeeklyPayrollEstimate = {
  start: string // YYYY-MM-DD
  end: string
  days: number
  projected_shifts: number
  scheduled_from_snapshot: number
  baseline_days_used: number
  after_hours_event_coverage: number
  after_hours_event_count: number
  regular_hours: number
  overtime_hours: number
  unassigned_coverage_hours: number
  estimated_hours: number
  estimated_payroll_cost: number
  overtime_cost_premium: number
  workforce_avg_hourly_rate: number
  staff_with_rates: number
  director_excluded_from_payroll: string[]
  salaried_excluded: string[]
  days_without_coverage: number
  per_staff: Array<{
    name: string
    hours: number
    ot_hours: number
    rate: number
    cost: number
  }>
}

export async function estimateBiWeeklyPayroll(
  startDate: string,
  endDate: string,
): Promise<BiWeeklyPayrollEstimate> {
  await requireManager()
  const admin = createAdminClient()

  const { getTemplateScheduleForRange } = await import("@/lib/actions/schedule-template-week")
  const { shiftsByDate, staffRoleMap } = await getTemplateScheduleForRange(startDate, endDate)

  // SALARIED staff — excluded from hourly payroll AND shift counts.
  // Paul (Director) and Marcus (Greeter) are both salaried.
  const SALARIED_FIRST_NAMES = new Set<string>(["paul", "marcus"])
  const DIRECTOR_NAMES = new Set<string>()
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
  const isDirector = isSalaried // legacy alias

  // Pay-rate lookup keyed by canonical lowercase name.
  // We iterate the RATE rows (not directory rows) so every saved rate
  // contributes — even when the directory has multiple aliases per
  // person or when one row has the profile_id and another doesn't.
  const nameToRate = new Map<string, number>()
  let avgRate = 0
  try {
    // 1) Pull EVERY pay rate (no scoping by directory.id), newest first.
    const { data: rateRows } = await admin
      .from("staff_pay_rates")
      .select("staff_id, hourly_rate, effective_date, created_at")
      .order("effective_date", { ascending: false })
      .order("created_at", { ascending: false })
    const rateByStaffId = new Map<string, number>()
    for (const rr of rateRows || []) {
      const val = Number(rr.hourly_rate)
      if (!isFinite(val) || val <= 0) continue
      if (!rateByStaffId.has(rr.staff_id)) rateByStaffId.set(rr.staff_id, val)
    }

    // 2) Pull directory rows so we can resolve staff_id → names.
    const { data: dirRows } = await admin
      .from("staff_directory")
      .select("id, name, profile_id")
      .not("name", "is", null)
    const dirById = new Map<string, { id: string; name: string; profile_id: string | null }>()
    const dirByProfileId = new Map<string, Array<{ id: string; name: string; profile_id: string | null }>>()
    for (const r of dirRows || []) {
      const row = { id: r.id, name: String(r.name || ""), profile_id: r.profile_id || null }
      dirById.set(r.id, row)
      if (r.profile_id) {
        const arr = dirByProfileId.get(r.profile_id) || []
        arr.push(row)
        dirByProfileId.set(r.profile_id, arr)
      }
    }

    // 3) Pull profiles so a rate keyed by profile_id (or directory row
    // missing a name) still maps to the snapshot's display name.
    const allProfileIds = new Set<string>()
    for (const r of dirRows || []) {
      if (r.profile_id) allProfileIds.add(r.profile_id)
    }
    for (const sid of Array.from(rateByStaffId.keys())) {
      allProfileIds.add(sid) // staff_id might itself be a profile_id
    }
    const { data: profileRows } = allProfileIds.size > 0
      ? await admin
        .from("profiles")
        .select("id, full_name")
        .in("id", Array.from(allProfileIds))
      : { data: [] as Array<{ id: string; full_name: string | null }> }
    const profileById = new Map<string, string>()
    for (const p of profileRows || []) {
      const nm = String(p.full_name || "").trim()
      if (nm) profileById.set(p.id, nm)
    }

    // 4) For each rate row, fan out names: directory row's name, its
    // sibling directory aliases (same profile_id), and the profile's
    // full_name. Key by full lowercase AND first-word token.
    const addName = (raw: string, rate: number) => {
      const nm = raw.trim().toLowerCase()
      if (!nm || isDirector(raw)) return
      if (!nameToRate.has(nm)) nameToRate.set(nm, rate)
      const first = nm.split(/\s+/)[0]
      if (first && first !== nm && !nameToRate.has(first)) {
        nameToRate.set(first, rate)
      }
    }
    const collectedRates: number[] = []
    for (const [staffId, rate] of Array.from(rateByStaffId.entries())) {
      let contributed = false
      // a) Direct directory.id match
      const dirRow = dirById.get(staffId)
      if (dirRow) {
        addName(dirRow.name, rate)
        contributed = true
        // Sibling rows on same profile_id (e.g. "Fabio" + "Fabrizio Generoso")
        if (dirRow.profile_id) {
          for (const sib of dirByProfileId.get(dirRow.profile_id) || []) {
            if (sib.id !== dirRow.id) addName(sib.name, rate)
          }
          const profNm = profileById.get(dirRow.profile_id)
          if (profNm) addName(profNm, rate)
        }
      }
      // b) staff_id stored as a profile_id (legacy path)
      const siblings = dirByProfileId.get(staffId) || []
      for (const sib of siblings) {
        addName(sib.name, rate)
        contributed = true
      }
      const profNmDirect = profileById.get(staffId)
      if (profNmDirect) {
        addName(profNmDirect, rate)
        contributed = true
      }
      if (contributed) collectedRates.push(rate)
    }
    if (collectedRates.length > 0) {
      avgRate = collectedRates.reduce((a, b) => a + b, 0) / collectedRates.length
    }
  } catch {
    // best-effort
  }

  const hoursBetween = (startHHMM?: string | null, endHHMM?: string | null): number => {
    if (!startHHMM || !endHHMM) return 0
    const [sh, sm] = startHHMM.split(":").map(Number)
    const [eh, em] = endHHMM.split(":").map(Number)
    if ([sh, sm, eh, em].some((n) => isNaN(n))) return 0
    let mins = eh * 60 + em - (sh * 60 + sm)
    if (mins < 0) mins += 24 * 60
    return mins / 60
  }

  const weekStartFor = (dateISO: string): string => {
    // Workweek = Sunday→Saturday in Eastern Time (US standard).
    const dow = easternDayOfWeek(dateISO)
    const d = new Date(toEasternIso(dateISO, "12:00"))
    d.setUTCDate(d.getUTCDate() - dow)
    return d.toISOString().slice(0, 10)
  }

  // Per-staff per-workweek hour ledger (Sun→Sat), Director excluded.
  const staffWeekHours = new Map<string, Map<string, number>>()
  const addStaffHours = (rawName: string, date: string, hrs: number) => {
    const key = String(rawName || "").trim().toLowerCase()
    if (!key || hrs <= 0 || isDirector(rawName)) return
    const wk = weekStartFor(date)
    let weeks = staffWeekHours.get(key)
    if (!weeks) {
      weeks = new Map()
      staffWeekHours.set(key, weeks)
    }
    weeks.set(wk, (weeks.get(wk) || 0) + hrs)
  }

  // Build the full list of calendar dates in the range so the baseline
  // floor still applies on days the snapshot doesn't cover. Dates are
  // evaluated in Eastern Time — the church runs on a NYC wall calendar.
  const dates: string[] = easternDateRange(startDate, endDate)

  let base = 0
  let daysWithoutCoverage = 0
  const unassignedHours = 0 // no baseline + no extras = always 0
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

  // After-hours events — counted for display only. Whoever is already
  // on the schedule covers the event as part of their normal shift.
  // We do NOT add extra slots or hours.
  const { data: events } = await admin
    .from("events")
    .select("title, start_time, end_time, required_ops, required_security, required_greeter")
    .gte("start_time", toEasternIso(startDate, "00:00"))
    .lte("start_time", toEasternIso(endDate, "23:59"))

  const extra = 0
  let afterHoursEventCount = 0
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", hour: "2-digit", hour12: false,
  })
  for (const ev of events || []) {
    if (!ev.start_time) continue
    if (ev.title === "Staff Operational Window" || ev.title === "Open for Tourism") continue
    const startHour = parseInt(fmt.format(new Date(ev.start_time)), 10)
    const isAfterHours = isNaN(startHour) ? false : startHour < 9 || startHour >= 17
    if (!isAfterHours) continue
    afterHoursEventCount += 1
  }
  const baselineDaysUsed = 0

  // Bi-weekly aggregate OT: hours over 80 across the entire pay period
  // are paid at 1.5×. (Per-pay-period rule, not federal per-workweek.)
  const PAY_PERIOD_OT_THRESHOLD = 80
  let regHours = 0
  let otHours = 0
  let staffCost = 0
  const perStaffSummary: BiWeeklyPayrollEstimate["per_staff"] = []
  for (const [nameKey, weeks] of Array.from(staffWeekHours.entries())) {
    const rate = nameToRate.get(nameKey) || avgRate
    let personHours = 0
    for (const hrs of Array.from(weeks.values())) {
      personHours += hrs
    }
    const personOt = Math.max(0, personHours - PAY_PERIOD_OT_THRESHOLD)
    const personReg = personHours - personOt
    const personCost = personReg * rate + personOt * rate * 1.5
    regHours += personReg
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
  perStaffSummary.sort((a, b) => b.cost - a.cost)

  const unassignedCost = unassignedHours * avgRate
  const totalHours = regHours + otHours + unassignedHours
  const totalCost = staffCost + unassignedCost

  return {
    start: startDate,
    end: endDate,
    days: dates.length,
    projected_shifts: base + extra,
    scheduled_from_snapshot: base,
    baseline_days_used: baselineDaysUsed,
    after_hours_event_coverage: extra,
    after_hours_event_count: afterHoursEventCount,
    regular_hours: Math.round(regHours * 10) / 10,
    overtime_hours: Math.round(otHours * 10) / 10,
    unassigned_coverage_hours: Math.round(unassignedHours * 10) / 10,
    estimated_hours: Math.round(totalHours * 10) / 10,
    estimated_payroll_cost: Math.round(totalCost * 100) / 100,
    overtime_cost_premium: Math.round(otHours * 0.5 * avgRate * 100) / 100,
    workforce_avg_hourly_rate: Math.round(avgRate * 100) / 100,
    staff_with_rates: nameToRate.size,
    director_excluded_from_payroll: Array.from(DIRECTOR_NAMES),
    salaried_excluded: Array.from(SALARIED_FIRST_NAMES),
    days_without_coverage: daysWithoutCoverage,
    per_staff: perStaffSummary,
  }
}
