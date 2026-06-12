"use client"

import { useEffect, useState } from "react"
import { Wrench, Clock, CheckCircle2, RefreshCw, Users, AlertTriangle, ChevronDown, ChevronUp, Trash2, Archive, Printer, FileText } from "lucide-react"
import { getManagerTickets, getOperationsStaff, assignTicket, unassignTicket, deleteTicket, clearAllTickets } from "@/lib/actions/tickets"
import { TicketArchiveViewer } from "@/components/manager/TicketArchiveViewer"
import { TicketCard } from "@/components/shared/TicketCard"

type Ticket = {
  id: string
  title: string
  description: string
  priority: "low" | "medium" | "high" | "urgent"
  status: string
  created_at: string
  resolved_at?: string | null
  assigned_to?: string | null
  user_id?: string
  event_id?: number | null
  events?: { title: string } | null
  profiles?: { full_name?: string; email?: string } | null
  assigned_profile?: { full_name?: string; email?: string } | null
}

type StaffMember = {
  id: string
  full_name: string | null
  email: string
  role: string
}

type FilterTab = "all" | "open" | "in_progress" | "resolved"

export function ManagerTicketCommand() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>("all")
  const [isPending, setIsPending] = useState(false)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [clearPending, setClearPending] = useState(false)

  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [allTickets, opsStaff] = await Promise.all([
        getManagerTickets(100),
        getOperationsStaff(),
      ])
      setTickets(allTickets || [])
      setStaff(opsStaff || [])
    } catch (err: any) {
      setError(err.message || "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleAssign = async (ticketId: string, assigneeId: string) => {
    setError(null)
    setIsPending(true)
    try {
      await assignTicket(ticketId, assigneeId)
      setAssigningId(null)
      await fetchAll()
    } catch (err: any) {
      setError(err.message || "Failed to assign ticket")
    } finally {
      setIsPending(false)
    }
  }

  const handleUnassign = async (ticketId: string) => {
    setError(null)
    setIsPending(true)
    try {
      await unassignTicket(ticketId)
      await fetchAll()
    } catch (err: any) {
      setError(err.message || "Failed to unassign ticket")
    } finally {
      setIsPending(false)
    }
  }

  const handleDelete = async (ticketId: string) => {
    setError(null)
    setIsPending(true)
    try {
      await deleteTicket(ticketId)
      await fetchAll()
    } catch (err: any) {
      setError(err.message || "Failed to delete ticket")
    } finally {
      setIsPending(false)
    }
  }

  const handleClearAll = async () => {
    if (!confirm("Clear all tickets?\n\nAll tickets will be archived and removed from the live list. This action is permanent.")) return
    setClearPending(true)
    setError(null)
    try {
      const result = await clearAllTickets()
      alert(`Archived ${result.archived} tickets successfully.`)
      await fetchAll()
    } catch (err: any) {
      setError(err.message || "Failed to clear tickets")
    } finally {
      setClearPending(false)
    }
  }

  const stats = {
    open: tickets.filter((t) => t.status === "open" && !t.assigned_to).length,
    unassigned: tickets.filter((t) => t.status === "open" && !t.assigned_to).length,
    assigned: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    urgent: tickets.filter((t) => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed").length,
    high: tickets.filter((t) => t.priority === "high" && t.status !== "resolved" && t.status !== "closed").length,
  }

  const filteredTickets = filter === "all"
    ? tickets
    : tickets.filter((t) => t.status === filter)

  const groupedByStatus = {
    open: filteredTickets.filter((t) => t.status === "open"),
    in_progress: filteredTickets.filter((t) => t.status === "in_progress"),
    resolved: filteredTickets.filter((t) => t.status === "resolved"),
    closed: filteredTickets.filter((t) => t.status === "closed"),
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--on-surface-variant)]">Loading ticket command...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-display-sm text-on-surface">Ticket Command</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Route and assign tickets to operations staff
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchive(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-xs font-bold"
            title="View archived tickets"
          >
            <Archive className="w-4 h-4" />
            Archive
          </button>
          <button
            onClick={handleClearAll}
            disabled={clearPending || isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-container text-on-surface hover:bg-red-900/20 hover:text-red-400 transition-colors text-xs font-bold disabled:opacity-50"
            title="Archive and clear all tickets"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
          <button
            onClick={fetchAll}
            disabled={isPending}
            className="p-3 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-primary ${isPending ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {showArchive && (
        <TicketArchiveViewer onClose={() => setShowArchive(false)} />
      )}

      {error && (
        <div className="p-4 bg-red-900/20 text-red-400 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Unassigned", value: stats.open, color: "bg-[var(--primary)]/10 text-[var(--primary)]", sub: "require routing" },
          { label: "In Progress", value: stats.assigned, color: "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]", sub: "being worked" },
          { label: "Resolved", value: stats.resolved, color: "bg-green-500/10 text-green-600", sub: "completed" },
          { label: "Urgent", value: stats.urgent, color: "bg-red-900/20 text-red-400", sub: "need attention" },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 rounded-2xl ${stat.color}`}>
            <p className="text-2xl font-extrabold">{stat.value}</p>
            <p className="text-xs font-bold uppercase tracking-wide">{stat.label}</p>
            <p className="text-[10px] opacity-70 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {[
          { key: "all", label: `All (${tickets.length})` },
          { key: "open", label: `Open (${tickets.filter(t => t.status === "open").length})` },
          { key: "in_progress", label: `In Progress (${groupedByStatus.in_progress.length})` },
          { key: "resolved", label: `Resolved (${groupedByStatus.resolved.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as FilterTab)}
            className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === tab.key
                ? "bg-primary text-white"
                : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {(["open", "in_progress", "resolved"] as const).map((groupStatus) => {
          const group = filteredTickets.filter((t) => t.status === groupStatus)
          if (group.length === 0) return null

          const statusLabel = groupStatus === "open" ? "Open / Unassigned" : groupStatus === "in_progress" ? "In Progress" : "Resolved"
          const statusIcon = groupStatus === "open" ? <Clock className="w-4 h-4" /> : groupStatus === "in_progress" ? <Wrench className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />

          return (
            <div key={groupStatus} className="space-y-4">
              <div className="flex items-center gap-2">
                {statusIcon}
                <h3 className="text-sm font-bold text-[var(--on-surface)]">
                  {statusLabel}
                </h3>
                <span className="text-xs text-[var(--on-surface-variant)] bg-surface-container px-2 py-0.5 rounded-full">
                  {group.length}
                </span>
              </div>

              {group.map((ticket) => (
                <ManagerTicketRow
                  key={ticket.id}
                  ticket={ticket}
                  staff={staff}
                  onAssign={handleAssign}
                  onUnassign={handleUnassign}
                  onDelete={handleDelete}
                  assigningId={assigningId}
                  setAssigningId={setAssigningId}
                />
              ))}
            </div>
          )
        })}

        {filteredTickets.length === 0 && (
          <div className="text-center py-12 bg-[var(--surface-container-low)] rounded-2xl">
            <Wrench className="w-10 h-10 mx-auto text-[var(--on-surface-variant)] opacity-30 mb-3" />
            <p className="text-sm text-[var(--on-surface-variant)]">No tickets in this category.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ManagerTicketRow({
  ticket,
  staff,
  onAssign,
  onUnassign,
  onDelete,
  assigningId,
  setAssigningId,
}: {
  ticket: Ticket
  staff: StaffMember[]
  onAssign: (ticketId: string, assigneeId: string) => void
  onUnassign: (ticketId: string) => void
  onDelete: (ticketId: string) => void
  assigningId: string | null
  setAssigningId: (id: string | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const priorityColors: Record<string, string> = {
    low: "bg-[var(--surface-container)] text-[var(--primary)]",
    medium: "bg-[var(--secondary-container)] text-[var(--secondary)]",
    high: "bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]",
    urgent: "bg-red-900/30 text-red-400",
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
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

  const printTicket = () => {
    const priorityColor = {
      low: "#155724", medium: "#735c00", high: "#8d0201", urgent: "#721c24",
    }[ticket.priority] || "#555"

    const statusColor = {
      open: "#002c5e", in_progress: "#735c00", resolved: "#155724", closed: "#555",
    }[ticket.status] || "#555"

    const printedAt = `${fmtDate(new Date().toISOString())} at ${fmtTime(new Date().toISOString())} ET`

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
      Ticket ID: ${ticket.id.slice(0,8).toUpperCase()}<br/>
      Date: ${fmtDate(ticket.created_at)}<br/>
      Time: ${fmtTime(ticket.created_at)} ET<br/>
      ${ticket.resolved_at ? `Resolved: ${fmtDate(ticket.resolved_at)} ${fmtTime(ticket.resolved_at)} ET<br/>` : ""}
      ${ticket.profiles?.full_name ? `Reported by: ${ticket.profiles.full_name}<br/>` : ""}
      ${ticket.assigned_profile?.full_name ? `Assigned to: ${ticket.assigned_profile.full_name}<br/>` : ""}
      ${ticket.events?.title ? `Event: ${ticket.events.title}<br/>` : ""}
      Printed: ${printedAt}<br/>
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
      <div class="summary-value">#${ticket.id.slice(0,8).toUpperCase()}</div>
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

  <footer>
    <span>Saint Nicholas National Shrine — Operations Ticket</span>
    <span>Printed ${printedAt}</span>
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

  return (
    <div className="bg-[var(--surface-container)] rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 flex items-center justify-between gap-3"
      >
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold text-[var(--on-surface)] truncate">{ticket.title}</h4>
          </div>
          <p className="text-xs text-[var(--on-surface-variant)]">
            {formatDate(ticket.created_at)}
            {ticket.events?.title && <span className="ml-2">· {ticket.events.title}</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${priorityColors[ticket.priority] || priorityColors.low}`}>
            {ticket.priority}
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-[var(--on-surface-variant)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--on-surface-variant)]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-[var(--outline-variant)]/20 space-y-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
              Description
            </span>
            <p className="text-sm text-[var(--on-surface)] mt-1 whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          {ticket.profiles?.full_name && (
            <div className="flex items-center gap-2 text-xs text-[var(--on-surface-variant)]">
              Reported by: <span className="font-bold">{ticket.profiles.full_name}</span>
            </div>
          )}

          {ticket.assigned_profile?.full_name && (
            <div className="flex items-center gap-2 text-xs text-[var(--on-surface-variant)]">
              Assigned to: <span className="font-bold">{ticket.assigned_profile.full_name}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-900/20 text-red-400 rounded-xl text-xs">{error}</div>
          )}

          <div className="flex gap-2 pt-2">
            {ticket.status === "open" && !ticket.assigned_to && (
              <button
                onClick={() => setAssigningId(ticket.id)}
                className="flex-1 py-2 px-4 bg-[var(--primary)] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Users className="w-4 h-4" />
                Route to Employee
              </button>
            )}
            {ticket.status === "in_progress" && ticket.assigned_to && (
              <button
                onClick={() => onUnassign(ticket.id)}
                className="flex-1 py-2 px-4 bg-[var(--surface-container-high)] text-[var(--on-surface)] rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-80 disabled:opacity-50 transition-opacity"
              >
                Unassign / Return to Pool
              </button>
            )}
          </div>

          {assigningId === ticket.id && (
            <div className="p-4 bg-[var(--surface-container-low)] rounded-xl space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--on-surface-variant)]">
                Select an employee to assign:
              </p>
              {staff.length === 0 ? (
                <p className="text-xs text-[var(--on-surface-variant)]">No operations staff available.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {staff.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => onAssign(ticket.id, member.id)}
                      className="p-3 text-left bg-surface-container hover:bg-surface-container-high rounded-xl transition-colors disabled:opacity-50"
                    >
                      <p className="text-sm font-bold text-[var(--on-surface)]">
                        {member.full_name || member.email}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setAssigningId(null)}
                className="w-full py-2 text-xs text-[var(--on-surface-variant)] hover:text-[var(--on-surface)] transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--on-surface-variant)] opacity-50">
              ID: {ticket.id.slice(0, 8)}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={printTicket}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
              <button
                onClick={() => {
                  if (confirm("Delete this ticket permanently?")) onDelete(ticket.id)
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}