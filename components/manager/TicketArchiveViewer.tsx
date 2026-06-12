"use client"

import { useState, useTransition, useMemo } from "react"
import {
  getArchivedTickets,
  getArchivedTicketDates,
  getArchivedTicketsByMonth,
  getArchivedTicketMonths,
  getArchivedTicketsByWeek,
  getArchivedTicketsByBiweek,
  getArchivedTicketWeeks,
} from "@/lib/actions/tickets"
import { easternWeekBounds, easternBiweekBounds, easternRangeLabel } from "@/lib/eastern-time"
import { X, Printer, ChevronDown, ChevronUp, Calendar, CalendarDays, FileText, CalendarRange } from "lucide-react"

interface ArchivedTicket {
  id: string
  original_id: string
  user_id: string | null
  event_id: number | null
  title: string
  description: string
  priority: string
  status: string
  media_urls: string[] | null
  assigned_to: string | null
  created_at: string
  resolved_at: string | null
  archive_date: string
  reporter_name: string | null
  assigned_name: string | null
  event_title: string | null
}

interface Props {
  onClose: () => void
}

export function TicketArchiveViewer({ onClose }: Props) {
  const [viewMode, setViewMode] = useState<"day" | "week" | "biweek" | "month">("day")
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().slice(0, 10)
  })
  const [selectedWeek, setSelectedWeek] = useState<string>(() => {
    const today = new Date()
    const year = today.getFullYear()
    const jan4 = new Date(Date.UTC(year, 0, 4))
    const jan4Day = jan4.getUTCDay()
    const monW1 = new Date(jan4.getTime() - ((jan4Day + 6) % 7) * 86400000)
    const weekNum = Math.floor((today.getTime() - monW1.getTime()) / (7 * 86400000)) + 1
    return `${year}-W${String(weekNum).padStart(2, "0")}`
  })
  const [selectedBiweekStart, setSelectedBiweekStart] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().slice(0, 10)
  })
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date()
    return today.toISOString().slice(0, 7)
  })
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "in_progress" | "resolved" | "closed">("all")
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high" | "urgent">("all")
  const [items, setItems] = useState<ArchivedTicket[]>([])
  const [pending, startTransition] = useTransition()
  const [selectedItem, setSelectedItem] = useState<ArchivedTicket | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [availableMonths, setAvailableMonths] = useState<string[]>([])
  const [availableWeeks, setAvailableWeeks] = useState<string[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  const loadDates = () => {
    startTransition(async () => {
      try {
        const [dates, months, weeks] = await Promise.all([
          getArchivedTicketDates(60),
          getArchivedTicketMonths(12),
          getArchivedTicketWeeks(12),
        ])
        setAvailableDates(dates)
        setAvailableMonths(months)
        setAvailableWeeks(weeks)
      } catch (err) {
        console.error("Failed to load archive dates", err)
      }
    })
  }

  const handleSearch = () => {
    setHasSearched(true)
    startTransition(async () => {
      try {
        const status = statusFilter === "all" ? undefined : statusFilter
        const priority = priorityFilter === "all" ? undefined : priorityFilter
        if (viewMode === "day") {
          const results = await getArchivedTickets(selectedDate, status, priority)
          setItems(results)
        } else if (viewMode === "week") {
          const results = await getArchivedTicketsByWeek(selectedWeek, status, priority)
          setItems(results)
        } else if (viewMode === "biweek") {
          const results = await getArchivedTicketsByBiweek(selectedBiweekStart, status, priority)
          setItems(results)
        } else {
          const results = await getArchivedTicketsByMonth(selectedMonth, status, priority)
          setItems(results)
        }
      } catch (err: any) {
        alert(err?.message || "Failed to load archived tickets")
      }
    })
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    })

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", {
      timeZone: "America/New_York", hour: "2-digit", minute: "2-digit",
    })

  const printedAt = () => `${fmtDate(new Date().toISOString())} at ${fmtTime(new Date().toISOString())} ET`

  const printTicket = (ticket: ArchivedTicket) => {
    const priorityColor = {
      low: "#155724", medium: "#735c00", high: "#8d0201", urgent: "#721c24",
    }[ticket.priority] || "#555"

    const statusColor = {
      open: "#002c5e", in_progress: "#735c00", resolved: "#155724", closed: "#555",
    }[ticket.status] || "#555"

    const mediaHtml = ticket.media_urls && ticket.media_urls.length > 0
      ? `<div style="margin-top:16px;">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#002c5e;margin-bottom:8px;">Attachments</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${ticket.media_urls.map((url, i) => `<a href="${url}" target="_blank" style="font-size:12px;color:#002c5e;text-decoration:underline;">Attachment ${i + 1}</a>`).join("")}
        </div>
      </div>`
      : ""

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Maintenance Ticket — ${ticket.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui,-apple-system,Arial,sans-serif; color: #111; background:#fff; padding:32px; font-size:13px; }
    header { border-bottom:3px solid #002c5e; padding-bottom:16px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-end; }
    .org { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#735c00; margin-bottom:4px; }
    .title { font-size:22px; font-weight:900; color:#002c5e; }
    .ref { font-size:11px; color:#555; text-align:right; line-height:1.7; }
    .badge { display:inline-block; padding:3px 12px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; margin-left:8px; color:#fff; }
    .summary { display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:20px; }
    .summary-box { background:#f8f9fa; border:1px solid #e8e8e8; border-radius:8px; padding:10px 14px; }
    .summary-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#555; margin-bottom:3px; }
    .summary-value { font-size:13px; color:#111; font-weight:600; }
    .desc { background:#f8f9fa; border-left:3px solid #002c5e; padding:12px 16px; border-radius:0 8px 8px 0; font-size:13px; line-height:1.6; white-space:pre-wrap; }
    footer { margin-top:32px; border-top:1px solid #ccc; padding-top:10px; font-size:10px; color:#888; display:flex; justify-content:space-between; }
    @media print { body { padding:16px; } }
  </style>
</head>
<body>
  <header>
    <img src="/images/logo-color.jpg" alt="Saint Nicholas Shrine" style="display:block;height:56px;width:auto;margin:0 0 12px;" />
    <div>
      <p class="org">Saint Nicholas National Shrine — Operations</p>
      <p class="title">Maintenance Ticket
        <span class="badge" style="background:${priorityColor}">${ticket.priority}</span>
        <span class="badge" style="background:${statusColor}">${ticket.status.replace(/_/g, " ")}</span>
      </p>
    </div>
    <div class="ref">
      Ticket ID: ${ticket.original_id.slice(0,8).toUpperCase()}<br/>
      Date: ${fmtDate(ticket.created_at)}<br/>
      Time: ${fmtTime(ticket.created_at)} ET<br/>
      ${ticket.resolved_at ? `Resolved: ${fmtDate(ticket.resolved_at)} ${fmtTime(ticket.resolved_at)} ET<br/>` : ""}
      ${ticket.reporter_name ? `Reported by: ${ticket.reporter_name}<br/>` : ""}
      ${ticket.assigned_name ? `Assigned to: ${ticket.assigned_name}<br/>` : ""}
      ${ticket.event_title ? `Event: ${ticket.event_title}<br/>` : ""}
      Printed: ${printedAt()}<br/>
      CONFIDENTIAL — INTERNAL USE ONLY
    </div>
  </header>

  <div class="summary">
    <div class="summary-box">
      <div class="summary-label">Priority</div>
      <div class="summary-value" style="text-transform:capitalize;color:${priorityColor}">${ticket.priority}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Status</div>
      <div class="summary-value" style="text-transform:capitalize;">${ticket.status.replace(/_/g, " ")}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Created</div>
      <div class="summary-value">${fmtDate(ticket.created_at)} ${fmtTime(ticket.created_at)} ET</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Ticket ID</div>
      <div class="summary-value">#${ticket.original_id.slice(0,8).toUpperCase()}</div>
    </div>
  </div>

  <div style="margin-bottom:20px;">
    <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#002c5e;border-bottom:1px solid #c0c8d8;padding-bottom:6px;margin-bottom:12px;">Title</p>
    <p style="font-size:15px;font-weight:700;color:#111;">${ticket.title}</p>
  </div>

  <div style="margin-bottom:20px;">
    <p style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#002c5e;border-bottom:1px solid #c0c8d8;padding-bottom:6px;margin-bottom:12px;">Description</p>
    <div class="desc">${ticket.description}</div>
  </div>

  ${mediaHtml}

  <footer>
    <span>Saint Nicholas National Shrine — Operations Ticket</span>
    <span>Printed ${printedAt()}</span>
  </footer>
  <script>window.onload = () => window.print()</script>
</body>
</html>`

    const win = window.open("", "_blank", "width=900,height=700")
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups for this site and try again.")
      return
    }
    win.document.write(html)
    win.document.close()
  }

  const generateReportHtml = (title: string, periodLabel: string, tickets: ArchivedTicket[]) => {
    const stats = {
      total: tickets.length,
      open: tickets.filter((t) => t.status === "open").length,
      in_progress: tickets.filter((t) => t.status === "in_progress").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
      urgent: tickets.filter((t) => t.priority === "urgent").length,
      high: tickets.filter((t) => t.priority === "high").length,
    }

    const groups: Record<string, ArchivedTicket[]> = {}
    tickets.forEach((t) => {
      if (!groups[t.archive_date]) groups[t.archive_date] = []
      groups[t.archive_date].push(t)
    })
    const groupedByDate = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))

    const rows = groupedByDate.map(([date, dayTickets]) => {
      const dayDate = new Date(date).toLocaleDateString("en-US", {
        timeZone: "America/New_York", weekday: "short", month: "short", day: "numeric",
      })
      const dayRows = dayTickets.map((t) => {
        const priorityColor = {
          low: "#155724", medium: "#735c00", high: "#8d0201", urgent: "#721c24",
        }[t.priority] || "#555"
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e8e8;font-size:12px;">${t.original_id.slice(0,8).toUpperCase()}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e8e8;font-size:12px;font-weight:600;">${t.title}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e8e8;font-size:12px;"><span style="color:${priorityColor};font-weight:700;text-transform:capitalize;">${t.priority}</span></td>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e8e8;font-size:12px;text-transform:capitalize;">${t.status.replace(/_/g, " ")}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e8e8;font-size:12px;">${t.reporter_name || "—"}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e8e8e8;font-size:12px;">${t.assigned_name || "—"}</td>
        </tr>`
      }).join("")
      return `
        <tr>
          <td colspan="6" style="padding:10px 12px;background:#f8f9fa;font-size:12px;font-weight:700;color:#002c5e;border-bottom:2px solid #c0c8d8;">
            ${dayDate} — ${dayTickets.length} ticket${dayTickets.length !== 1 ? "s" : ""}
          </td>
        </tr>
        ${dayRows}
      `
    }).join("")

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${title} — ${periodLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui,-apple-system,Arial,sans-serif; color: #111; background:#fff; padding:32px; font-size:13px; }
    header { border-bottom:3px solid #002c5e; padding-bottom:16px; margin-bottom:24px; }
    .org { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:#735c00; margin-bottom:4px; }
    .title { font-size:22px; font-weight:900; color:#002c5e; }
    .summary { display:grid; grid-template-columns: repeat(6, 1fr); gap:12px; margin-bottom:24px; }
    .summary-box { background:#f8f9fa; border:1px solid #e8e8e8; border-radius:8px; padding:10px 14px; text-align:center; }
    .summary-label { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#555; margin-bottom:3px; }
    .summary-value { font-size:18px; color:#111; font-weight:800; }
    table { width:100%; border-collapse:collapse; margin-top:12px; }
    th { text-align:left; padding:8px 12px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#555; border-bottom:2px solid #c0c8d8; background:#f8f9fa; }
    footer { margin-top:32px; border-top:1px solid #ccc; padding-top:10px; font-size:10px; color:#888; display:flex; justify-content:space-between; }
    @media print { body { padding:16px; } }
  </style>
</head>
<body>
  <header>
    <img src="/images/logo-color.jpg" alt="Saint Nicholas Shrine" style="display:block;height:56px;width:auto;margin:0 0 12px;" />
    <p class="org">Saint Nicholas National Shrine — Operations</p>
    <p class="title">${title} — ${periodLabel}</p>
  </header>

  <div class="summary">
    <div class="summary-box">
      <div class="summary-label">Total</div>
      <div class="summary-value">${stats.total}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Open</div>
      <div class="summary-value">${stats.open}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">In Progress</div>
      <div class="summary-value">${stats.in_progress}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Resolved</div>
      <div class="summary-value">${stats.resolved}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">Urgent</div>
      <div class="summary-value">${stats.urgent}</div>
    </div>
    <div class="summary-box">
      <div class="summary-label">High</div>
      <div class="summary-value">${stats.high}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Title</th>
        <th>Priority</th>
        <th>Status</th>
        <th>Reporter</th>
        <th>Assigned</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <footer>
    <span>Saint Nicholas National Shrine — Operations</span>
    <span>Printed ${printedAt()} · CONFIDENTIAL — INTERNAL USE ONLY</span>
  </footer>
  <script>window.onload = () => window.print()</script>
</body>
</html>`
  }

  const printPeriodReport = (tickets: ArchivedTicket[]) => {
    let title = "Ticket Report"
    let periodLabel = ""

    if (viewMode === "week") {
      const { start, end } = easternWeekBounds(selectedWeek)
      title = "Weekly Ticket Report"
      periodLabel = easternRangeLabel(start, end)
    } else if (viewMode === "biweek") {
      const { start, end } = easternBiweekBounds(selectedBiweekStart)
      title = "Biweekly Ticket Report"
      periodLabel = easternRangeLabel(start, end)
    } else if (viewMode === "month") {
      const monthName = new Date(`${selectedMonth}-01`).toLocaleDateString("en-US", {
        timeZone: "America/New_York", year: "numeric", month: "long",
      })
      title = "Monthly Ticket Report"
      periodLabel = monthName
    }

    const html = generateReportHtml(title, periodLabel, tickets)
    const win = window.open("", "_blank", "width=1100,height=800")
    if (!win) {
      alert("Pop-up blocked. Please allow pop-ups for this site and try again.")
      return
    }
    win.document.write(html)
    win.document.close()
  }

  const groupedByDate = useMemo(() => {
    const groups: Record<string, ArchivedTicket[]> = {}
    items.forEach((t) => {
      if (!groups[t.archive_date]) groups[t.archive_date] = []
      groups[t.archive_date].push(t)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  const periodLabel = useMemo(() => {
    if (viewMode === "week") {
      const { start, end } = easternWeekBounds(selectedWeek)
      return easternRangeLabel(start, end)
    }
    if (viewMode === "biweek") {
      const { start, end } = easternBiweekBounds(selectedBiweekStart)
      return easternRangeLabel(start, end)
    }
    if (viewMode === "month") {
      return new Date(`${selectedMonth}-01`).toLocaleDateString("en-US", {
        timeZone: "America/New_York", year: "numeric", month: "long",
      })
    }
    return selectedDate
  }, [viewMode, selectedWeek, selectedBiweekStart, selectedMonth, selectedDate])

  const showPeriodPrint = viewMode !== "day" && items.length > 0

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-16 overflow-y-auto">
      <div className="w-full max-w-3xl bg-surface-container-lowest dark:bg-surface-container rounded-2xl shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-outline-variant/20">
          <div>
            <h2 className="text-xl font-bold text-on-surface">Ticket Archive</h2>
            <p className="text-xs text-on-surface-variant mt-1">
              Browse and print historical maintenance tickets
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Toggle */}
        <div className="px-6 pt-6">
          <div className="flex rounded-xl bg-surface-container p-0.5 w-fit flex-wrap">
            {([
              { key: "day", label: "Daily", icon: CalendarDays },
              { key: "week", label: "Weekly", icon: Calendar },
              { key: "biweek", label: "Biweekly", icon: CalendarRange },
              { key: "month", label: "Monthly", icon: Calendar },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => { setViewMode(key); setHasSearched(false); setItems([]); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  viewMode === key
                    ? "bg-surface shadow-sm text-primary"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 space-y-4 border-b border-outline-variant/20">
          <div className="flex flex-wrap gap-3 items-end">
            {viewMode === "day" && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  onFocus={loadDates}
                  className="px-3 py-2 rounded-xl bg-surface-container text-on-surface text-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            {viewMode === "week" && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Week</label>
                <input
                  type="week"
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(e.target.value)}
                  onFocus={loadDates}
                  className="px-3 py-2 rounded-xl bg-surface-container text-on-surface text-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            {viewMode === "biweek" && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Biweek Start</label>
                <input
                  type="date"
                  value={selectedBiweekStart}
                  onChange={(e) => setSelectedBiweekStart(e.target.value)}
                  onFocus={loadDates}
                  className="px-3 py-2 rounded-xl bg-surface-container text-on-surface text-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-[10px] text-on-surface-variant">
                  14-day period from {selectedBiweekStart}
                </p>
              </div>
            )}

            {viewMode === "month" && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Month</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  onFocus={loadDates}
                  className="px-3 py-2 rounded-xl bg-surface-container text-on-surface text-sm border border-outline-variant/30 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Status</label>
              <div className="flex rounded-xl bg-surface-container p-0.5">
                {(["all", "open", "in_progress", "resolved"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                      statusFilter === s
                        ? "bg-surface shadow-sm text-primary"
                        : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {s.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Priority</label>
              <div className="flex rounded-xl bg-surface-container p-0.5">
                {(["all", "low", "medium", "high", "urgent"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriorityFilter(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                      priorityFilter === p
                        ? "bg-surface shadow-sm text-primary"
                        : "text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              {showPeriodPrint && (
                <button
                  onClick={() => printPeriodReport(items)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-xs font-bold"
                >
                  <FileText className="w-4 h-4" />
                  Print {viewMode === "week" ? "Weekly" : viewMode === "biweek" ? "Biweekly" : "Monthly"} Report
                </button>
              )}
              <button
                onClick={handleSearch}
                disabled={pending}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {pending ? "Loading…" : "Search Archive"}
              </button>
            </div>
          </div>

          {/* Quick picks */}
          {viewMode === "day" && availableDates.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Quick dates:</span>
              {availableDates.slice(0, 10).map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors ${
                    selectedDate === d
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  {d.slice(5)}
                </button>
              ))}
            </div>
          )}

          {viewMode === "week" && availableWeeks.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Quick weeks:</span>
              {availableWeeks.slice(0, 8).map((w) => {
                const { start, end } = easternWeekBounds(w)
                return (
                  <button
                    key={w}
                    onClick={() => setSelectedWeek(w)}
                    className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors ${
                      selectedWeek === w
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {w} ({start.slice(5)} – {end.slice(5)})
                  </button>
                )
              })}
            </div>
          )}

          {viewMode === "month" && availableMonths.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Quick months:</span>
              {availableMonths.slice(0, 8).map((m) => {
                const monthName = new Date(`${m}-01`).toLocaleDateString("en-US", {
                  timeZone: "America/New_York", year: "numeric", month: "short",
                })
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors ${
                      selectedMonth === m
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                    }`}
                  >
                    {monthName}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {!hasSearched && !pending ? (
            <p className="text-sm text-on-surface-variant text-center py-8">
              {viewMode === "day"
                ? "Select a date and filters, then click Search Archive to view historical tickets."
                : viewMode === "week"
                ? "Select a week and filters, then click Search Archive to view tickets for that week."
                : viewMode === "biweek"
                ? "Select a biweekly start date and filters, then click Search Archive to view tickets for that 14-day period."
                : "Select a month and filters, then click Search Archive to view all tickets for that month."}
            </p>
          ) : pending ? (
            <p className="text-sm text-on-surface-variant text-center py-8">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-8">
              No archived tickets found for {periodLabel}.
            </p>
          ) : viewMode === "day" ? (
            <div className="space-y-3">
              {items.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  selectedItem={selectedItem}
                  setSelectedItem={setSelectedItem}
                  printTicket={printTicket}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {groupedByDate.map(([date, dayTickets]) => {
                const dayDate = new Date(date).toLocaleDateString("en-US", {
                  timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric",
                })
                return (
                  <div key={date} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-outline-variant/20" />
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                        {dayDate}
                      </span>
                      <span className="text-[10px] text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                        {dayTickets.length} ticket{dayTickets.length !== 1 ? "s" : ""}
                      </span>
                      <div className="h-px flex-1 bg-outline-variant/20" />
                    </div>
                    {dayTickets.map((ticket) => (
                      <TicketRow
                        key={ticket.id}
                        ticket={ticket}
                        selectedItem={selectedItem}
                        setSelectedItem={setSelectedItem}
                        printTicket={printTicket}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TicketRow({
  ticket,
  selectedItem,
  setSelectedItem,
  printTicket,
}: {
  ticket: ArchivedTicket
  selectedItem: ArchivedTicket | null
  setSelectedItem: (t: ArchivedTicket | null) => void
  printTicket: (t: ArchivedTicket) => void
}) {
  return (
    <div className="bg-surface-container rounded-xl p-4 hover:bg-surface-container-high transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              ticket.priority === "urgent"
                ? "bg-red-100 text-red-700"
                : ticket.priority === "high"
                ? "bg-tertiary-container text-on-tertiary-container"
                : "bg-surface-container-high text-on-surface-variant"
            }`}>
              {ticket.priority}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
              ticket.status === "resolved"
                ? "bg-green-100 text-green-700"
                : ticket.status === "in_progress"
                ? "bg-primary/10 text-primary"
                : "bg-surface-container-high text-on-surface-variant"
            }`}>
              {ticket.status.replace(/_/g, " ")}
            </span>
            <span className="text-xs text-on-surface-variant">
              {new Date(ticket.created_at).toLocaleTimeString("en-US", {
                timeZone: "America/New_York",
                hour: "2-digit", minute: "2-digit",
              })} ET
            </span>
          </div>
          <p className="text-sm font-semibold text-on-surface mt-1 truncate">
            {ticket.title}
          </p>
          {ticket.reporter_name && (
            <p className="text-xs text-on-surface-variant mt-0.5">
              Reported by {ticket.reporter_name}
              {ticket.assigned_name ? ` · Assigned to ${ticket.assigned_name}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => printTicket(ticket)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors text-xs font-medium"
            title="Print this ticket"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <button
            onClick={() => setSelectedItem(selectedItem?.id === ticket.id ? null : ticket)}
            className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant"
            title="View details"
          >
            {selectedItem?.id === ticket.id ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {selectedItem?.id === ticket.id && (
        <div className="mt-4 pt-4 border-t border-outline-variant/20">
          <div className="bg-surface-container rounded-xl p-4 text-sm text-on-surface whitespace-pre-wrap leading-relaxed border-l-4 border-primary">
            {ticket.description}
          </div>
          {ticket.media_urls && ticket.media_urls.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase text-on-surface-variant mb-2">Attachments</p>
              <div className="flex flex-wrap gap-2">
                {ticket.media_urls.map((url, i) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline hover:text-primary/80"
                  >
                    Attachment {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
