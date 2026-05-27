"use client"

import { useEffect, useState, useTransition } from "react"
import { Wrench, Clock, CheckCircle2, RefreshCw, Users, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react"
import { getManagerTickets, getOperationsStaff, assignTicket, unassignTicket } from "@/lib/actions/tickets"
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
  const [isPending, startTransition] = useTransition()
  const [assigningId, setAssigningId] = useState<string | null>(null)

  const fetchAll = () => {
    setLoading(true)
    setError(null)
    startTransition(async () => {
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
    })
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const handleAssign = (ticketId: string, assigneeId: string) => {
    setError(null)
    startTransition(async () => {
      try {
        await assignTicket(ticketId, assigneeId)
        setAssigningId(null)
        await fetchAll()
      } catch (err: any) {
        setError(err.message || "Failed to assign ticket")
      }
    })
  }

  const handleUnassign = (ticketId: string) => {
    setError(null)
    startTransition(async () => {
      try {
        await unassignTicket(ticketId)
        await fetchAll()
      } catch (err: any) {
        setError(err.message || "Failed to unassign ticket")
      }
    })
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
        <button
          onClick={fetchAll}
          disabled={isPending}
          className="p-3 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 text-primary ${isPending ? "animate-spin" : ""}`} />
        </button>
      </div>

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
  assigningId,
  setAssigningId,
}: {
  ticket: Ticket
  staff: StaffMember[]
  onAssign: (ticketId: string, assigneeId: string) => void
  onUnassign: (ticketId: string) => void
  assigningId: string | null
  setAssigningId: (id: string | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
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
                disabled={isPending}
                className="flex-1 py-2 px-4 bg-[var(--primary)] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Users className="w-4 h-4" />
                Route to Employee
              </button>
            )}
            {ticket.status === "in_progress" && ticket.assigned_to && (
              <button
                onClick={() => startTransition(() => onUnassign(ticket.id))}
                disabled={isPending}
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
                      onClick={() => startTransition(() => onAssign(ticket.id, member.id))}
                      disabled={isPending}
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

          <div className="text-[10px] text-[var(--on-surface-variant)] opacity-50">
            ID: {ticket.id.slice(0, 8)}
          </div>
        </div>
      )}
    </div>
  )
}