"use server"

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { requireManager } from "./auth-helpers"

// ─── Pay Period Math ───

export type PayPeriod = {
  start: Date
  end: Date
  label: string
  periodNumber: number // 1 or 2
}

export async function getPayPeriod(dateInput: Date | string): Promise<PayPeriod> {
  const d = typeof dateInput === "string" ? new Date(dateInput) : new Date(dateInput)
  const year = d.getFullYear()
  const month = d.getMonth()
  const day = d.getDate()

  if (day <= 15) {
    const start = new Date(year, month, 1)
    const end = new Date(year, month, 15, 23, 59, 59, 999)
    return { start, end, label: `${start.toLocaleDateString("en-US", { month: "long" })} 1–15, ${year}`, periodNumber: 1 }
  } else {
    const start = new Date(year, month, 16)
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999)
    return { start, end, label: `${start.toLocaleDateString("en-US", { month: "long" })} 16–${end.getDate()}, ${year}`, periodNumber: 2 }
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
  const { data: rates, error } = await admin
    .from("staff_pay_rates")
    .select("*, staff_directory(id, name, role, profile_id)")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return rates || []
}

export async function getCurrentPayRate(staffId: string): Promise<number> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("staff_pay_rates")
    .select("hourly_rate")
    .eq("staff_id", staffId)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data?.hourly_rate ? Number(data.hourly_rate) : 0
}

export async function savePayRate(staffId: string, hourlyRate: number, role: string, notes?: string) {
  await requireManager()
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("staff_pay_rates")
    .select("id")
    .eq("staff_id", staffId)
    .maybeSingle()

  if (existing) {
    const { error } = await admin
      .from("staff_pay_rates")
      .update({ hourly_rate: hourlyRate, role, notes, updated_at: new Date().toISOString() })
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

    const dateStr = clockIn.toISOString().split("T")[0]
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
    .in("profile_id", userIds)

  const profileMap = new Map((profiles || []).map(p => [p.id, p]))
  const staffDirMap = new Map((staffDir || []).map(s => [s.profile_id, s]))

  // 6. Get pay rates
  const staffDirIds = (staffDir || []).map(s => s.id)
  const { data: rates } = await admin
    .from("staff_pay_rates")
    .select("staff_id, hourly_rate")
    .in("staff_id", staffDirIds)

  const rateMap = new Map((rates || []).map(r => [r.staff_id, Number(r.hourly_rate)]))

  // 7. Build all days in period
  const allDays: string[] = []
  const cursor = new Date(periodStart)
  while (cursor <= periodEnd) {
    allDays.push(cursor.toISOString().split("T")[0])
    cursor.setDate(cursor.getDate() + 1)
  }

  // 8. Build rows per staff member
  const staffRows: StaffPayrollRow[] = []
  for (const userId of userIds) {
    const profile = profileMap.get(userId)
    const staff = staffDirMap.get(userId)
    const name = profile?.full_name || staff?.name || `User ${userId.slice(0, 8)}`
    const role = profile?.role || staff?.role || "staff"
    const staffId = staff?.id || ""
    const hourlyRate = staffId ? (rateMap.get(staffId) || 0) : 0

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

  const { error } = await admin.from("payroll_reports").insert({
    period_start: data.period.start.toISOString().slice(0, 10),
    period_end: data.period.end.toISOString().slice(0, 10),
    title: `Payroll Report — ${data.period.label}`,
    slug,
    status: "draft",
    content: data as any,
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
