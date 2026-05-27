"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  generatePayrollHtml,
  archivePayrollReport,
  savePayRate,
  type PayPeriod,
  type PayrollReportData,
} from "@/lib/actions/payroll"
import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Globe,
  Archive,
  DollarSign,
  Calculator,
  AlertCircle,
} from "lucide-react"

function formatDateKey(d: Date) {
  return d.toISOString().split("T")[0]
}

function getDaysInPeriod(start: Date, end: Date): Date[] {
  const days: Date[] = []
  const cursor = new Date(start)
  while (cursor <= end) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function PayrollClient({
  period,
  prevPeriod,
  nextPeriod,
  payrollData,
  payRates,
  staffDirectory,
  error,
}: {
  period: PayPeriod
  prevPeriod: PayPeriod
  nextPeriod: PayPeriod
  payrollData: PayrollReportData | null
  payRates: any[]
  staffDirectory: any[]
  error: string | null
}) {
  const router = useRouter()
  const days = getDaysInPeriod(period.start, period.end)
  const [showRates, setShowRates] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(error)

  const navigateTo = (targetPeriod: PayPeriod) => {
    const params = new URLSearchParams()
    params.set("date", formatDateKey(targetPeriod.start))
    router.push(`/manager/payroll?${params.toString()}`)
  }

  const handleGeneratePdf = async () => {
    if (!payrollData) return
    setGeneratingPdf(true)
    setLocalError(null)
    try {
      const html = await generatePayrollHtml(payrollData)
      const res = await fetch("/api/generate-payroll-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html }),
      })
      const data = await res.json()
      if (data.pdfUrl) {
        window.open(data.pdfUrl, "_blank")
        setMessage("PDF generated successfully.")
      } else {
        setLocalError(data.error || "PDF generation failed.")
      }
    } catch (e: any) {
      setLocalError(e.message)
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleGenerateHtml = async () => {
    if (!payrollData) return
    const html = await generatePayrollHtml(payrollData)
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payroll-${formatDateKey(period.start)}.html`
    a.click()
    URL.revokeObjectURL(url)
    setMessage("HTML downloaded.")
  }

  const handleArchive = async () => {
    if (!payrollData) return
    setArchiving(true)
    setLocalError(null)
    try {
      const result = await archivePayrollReport(payrollData)
      setMessage(`Archived as "${result.slug}"`)
      router.push("/payroll/archive")
    } catch (e: any) {
      setLocalError(e.message)
    } finally {
      setArchiving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Period Navigation */}
      <div className="bg-surface-container-low rounded-[2rem] p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateTo(prevPeriod)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-colors text-sm font-bold"
          >
            <ChevronLeft className="w-4 h-4" />
            {prevPeriod.label}
          </button>

          <div className="text-center">
            <h3 className="font-headline text-2xl font-bold text-primary">{period.label}</h3>
            <p className="text-xs text-on-surface-variant">Pay Period #{period.periodNumber}</p>
          </div>

          <button
            onClick={() => navigateTo(nextPeriod)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-colors text-sm font-bold"
          >
            {nextPeriod.label}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Mini Calendar */}
        <div className="grid grid-cols-7 gap-2 mt-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
            <div key={d} className="text-center text-[10px] uppercase tracking-widest text-on-surface-variant font-bold py-2">
              {d}
            </div>
          ))}
          {Array.from({ length: period.start.getDay() }, (_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {days.map((day, i) => {
            const isToday = formatDateKey(day) === formatDateKey(new Date())
            return (
              <div
                key={i}
                className={`aspect-square flex items-center justify-center rounded-xl text-sm font-bold ${
                  isToday
                    ? "bg-primary text-white"
                    : "bg-surface-container-high text-on-surface"
                }`}
              >
                {day.getDate()}
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary Cards */}
      {payrollData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card-surface p-6 rounded-2xl">
            <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-1">Staff Members</p>
            <p className="text-3xl font-black text-primary">{payrollData.staffRows.length}</p>
          </div>
          <div className="card-surface p-6 rounded-2xl">
            <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-1">Total Hours</p>
            <p className="text-3xl font-black text-primary">{payrollData.grandTotalHours.toFixed(2)}</p>
          </div>
          <div className="card-surface p-6 rounded-2xl">
            <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-1">Total Payroll</p>
            <p className="text-3xl font-black text-secondary">${payrollData.grandTotalPay.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Error / Message */}
      {localError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-error-container text-on-error-container text-sm">
          <AlertCircle className="w-4 h-4" />
          {localError}
          <button onClick={() => setLocalError(null)} className="ml-auto">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
      {message && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary-container text-on-primary-container text-sm">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          {message}
          <button onClick={() => setMessage(null)} className="ml-auto">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setShowRates(!showRates)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-colors text-sm font-bold"
        >
          <DollarSign className="w-4 h-4" />
          {showRates ? "Hide Pay Rates" : "Manage Pay Rates"}
        </button>
        <button
          onClick={handleGenerateHtml}
          disabled={!payrollData}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-highest transition-colors text-sm font-bold disabled:opacity-50"
        >
          <Globe className="w-4 h-4" />
          Generate HTML
        </button>
        <button
          onClick={handleGeneratePdf}
          disabled={!payrollData || generatingPdf}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary text-on-secondary hover:bg-secondary/90 transition-colors text-sm font-bold disabled:opacity-50"
        >
          <FileText className="w-4 h-4" />
          {generatingPdf ? "Generating..." : "Generate PDF"}
        </button>
        <button
          onClick={handleArchive}
          disabled={!payrollData || archiving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary/90 transition-colors text-sm font-bold disabled:opacity-50"
        >
          <Archive className="w-4 h-4" />
          {archiving ? "Archiving..." : "Archive Report"}
        </button>
      </div>

      {/* Pay Rate Editor */}
      {showRates && (
        <div className="card-surface rounded-[2rem] p-6">
          <h3 className="font-headline text-xl font-bold text-primary mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Staff Pay Rates
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]">
              <thead>
                <tr className="border-b border-outline-variant/15">
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant">Staff</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant">Role</th>
                  <th className="text-right px-4 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant">Hourly Rate</th>
                  <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant">Action</th>
                </tr>
              </thead>
              <tbody>
                {staffDirectory.map((staff) => {
                  const rate = payRates.find((r: any) => r.staff_id === staff.id)
                  return (
                    <PayRateRow
                      key={staff.id}
                      staff={staff}
                      existingRate={rate}
                      onSaved={() => {
                        setMessage("Pay rate saved.")
                        router.refresh()
                      }}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payroll Table */}
      <div className="bg-surface-container-low rounded-[2rem] overflow-hidden">
        <div className="p-6 pb-4 flex items-center justify-between">
          <h3 className="font-headline text-xl font-bold text-primary flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Hours & Payroll
          </h3>
          <span className="text-xs text-on-surface-variant">
            {payrollData ? `${payrollData.staffRows.length} staff` : "No data"}
          </span>
        </div>

        {!payrollData || payrollData.staffRows.length === 0 ? (
          <div className="text-center py-20">
            <Calculator className="w-12 h-12 mx-auto text-on-surface-variant opacity-30 mb-3" />
            <p className="text-sm text-on-surface-variant font-medium">No clocked shifts for this pay period.</p>
            <p className="text-xs text-on-surface-variant opacity-60 mt-1">
              Staff must clock in and out for hours to appear.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/15">
                  <th className="sticky left-0 bg-surface-container-low z-10 text-left px-4 py-3 font-label text-[11px] uppercase tracking-widest text-on-surface-variant min-w-[140px]">
                    Staff / Role
                  </th>
                  <th className="px-3 py-3 text-right font-label text-[11px] uppercase tracking-widest text-on-surface-variant min-w-[80px]">
                    Rate
                  </th>
                  {days.map((day, i) => (
                    <th
                      key={i}
                      className={`px-2 py-3 text-center font-label text-[10px] uppercase tracking-widest min-w-[56px] ${
                        formatDateKey(day) === formatDateKey(new Date()) ? "text-primary" : "text-on-surface-variant"
                      }`}
                    >
                      <span className="block">{day.toLocaleDateString("en-US", { weekday: "narrow" })}</span>
                      <span className={`block text-xs font-bold ${formatDateKey(day) === formatDateKey(new Date()) ? "text-primary" : ""}`}>
                        {day.getDate()}
                      </span>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-right font-label text-[11px] uppercase tracking-widest text-on-surface-variant min-w-[80px]">
                    Total Hrs
                  </th>
                  <th className="px-3 py-3 text-right font-label text-[11px] uppercase tracking-widest text-on-surface-variant min-w-[100px]">
                    Gross Pay
                  </th>
                </tr>
              </thead>
              <tbody>
                {payrollData.staffRows.map((row) => (
                  <tr key={row.staffId || row.profileId} className="border-b border-outline-variant/10 hover:bg-surface-container-higher/30 transition-colors">
                    <td className="sticky left-0 bg-surface-container-low z-10 px-4 py-3">
                      <span className="font-headline font-bold text-sm text-on-surface block leading-tight">{row.name}</span>
                      <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">{row.role}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-medium text-on-surface-variant">
                      ${row.hourlyRate.toFixed(2)}
                    </td>
                    {row.dailyHours.map((d, i) => (
                      <td
                        key={i}
                        className={`px-2 py-3 text-center text-xs font-medium ${
                          d.hours > 0 ? "text-on-surface" : "text-on-surface-variant/30"
                        }`}
                      >
                        {d.hours > 0 ? d.hours.toFixed(1) : "—"}
                      </td>
                    ))}
                    <td className="px-3 py-3 text-right text-sm font-bold text-primary">
                      {row.totalHours.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right text-sm font-bold text-secondary">
                      ${row.grossPay.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-outline-variant/30 bg-surface-container-higher/50">
                  <td className="sticky left-0 bg-surface-container-higher/50 z-10 px-4 py-3 font-headline font-bold text-sm text-on-surface" colSpan={2 + days.length}>
                    Grand Total
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-black text-primary">
                    {payrollData.grandTotalHours.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right text-sm font-black text-secondary">
                    ${payrollData.grandTotalPay.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function PayRateRow({
  staff,
  existingRate,
  onSaved,
}: {
  staff: any
  existingRate: any
  onSaved: () => void
}) {
  const [rate, setRate] = useState(existingRate?.hourly_rate ? Number(existingRate.hourly_rate).toFixed(2) : "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const num = parseFloat(rate)
    if (isNaN(num) || num < 0) return
    setSaving(true)
    try {
      await savePayRate(staff.id, num, staff.role || "operations")
      onSaved()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr className="border-b border-outline-variant/10">
      <td className="px-4 py-3">
        <span className="font-bold text-sm text-on-surface">{staff.name}</span>
      </td>
      <td className="px-4 py-3 text-xs uppercase tracking-widest text-on-surface-variant">
        {staff.role}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <span className="text-on-surface-variant">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-24 input-surface px-3 py-2 text-right text-sm"
            placeholder="0.00"
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold disabled:opacity-50"
        >
          {saving ? "..." : "Save"}
        </button>
      </td>
    </tr>
  )
}
