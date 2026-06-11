"use client"

import { useState } from "react"
import { Wrench, Clock, CheckCircle2, AlertTriangle, User, RefreshCw, Users as Handshake } from "lucide-react"
import { claimTicket, completeTicket, unassignTicket } from "@/lib/actions/tickets"

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

const priorityConfig: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: "bg-[var(--surface-container)]", text: "text-[var(--primary)]", label: "Low" },
  medium: { bg: "bg-[var(--secondary-container)]", text: "text-[var(--secondary)]", label: "Medium" },
  high: { bg: "bg-[var(--tertiary-container)]", text: "text-[var(--on-tertiary-container)]", label: "High" },
  urgent: { bg: "bg-red-900/30", text: "text-red-400", label: "Urgent" },
}

const statusConfig: Record<string, { icon: typeof Clock; label: string; chipClass: string }> = {
  open: { icon: Clock, label: "Open", chipClass: "bg-[var(--primary)]/10 text-[var(--primary)]" },
  in_progress: { icon: Wrench, label: "In Progress", chipClass: "bg-[var(--secondary-container)] text-[var(--on-secondary-container)]" },
  resolved: { icon: CheckCircle2, label: "Resolved", chipClass: "bg-green-500/10 text-green-500" },
  closed: { icon: CheckCircle2, label: "Closed", chipClass: "bg-[var(--surface-container)] text-[var(--on-surface-variant)]" },
}

interface TicketCardProps {
  ticket: Ticket
  mode: "operations" | "manager" | "view"
  staffList?: any[]
  onAssign?: (ticketId: string, assigneeId: string) => void
  onClaim?: (ticketId: string) => void
  onUnassign?: (ticketId: string) => void
  onComplete?: (ticketId: string) => void
  onUpdate: () => void
}

export function TicketCard({ ticket, mode, staffList = [], onAssign, onClaim, onUnassign, onComplete, onUpdate }: TicketCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedAssignee, setSelectedAssignee] = useState<string>("")

  const priority = priorityConfig[ticket.priority] || priorityConfig.low
  const status = statusConfig[ticket.status] || statusConfig.open
  const StatusIcon = status.icon

  const handleClaim = async () => {
    if (onClaim) {
      onClaim(ticket.id)
      return
    }
    setError(null)
    setIsPending(true)
    try {
      await claimTicket(ticket.id)
      onUpdate()
    } catch (err: any) {
      setError(err.message || "Failed to claim ticket")
    } finally {
      setIsPending(false)
    }
  }

  const handleComplete = async () => {
    if (onComplete) {
      onComplete(ticket.id)
      return
    }
    setError(null)
    setIsPending(true)
    try {
      await completeTicket(ticket.id)
      onUpdate()
    } catch (err: any) {
      setError(err.message || "Failed to complete ticket")
    } finally {
      setIsPending(false)
    }
  }

  const handleUnassign = async () => {
    if (onUnassign) {
      onUnassign(ticket.id)
      return
    }
    setError(null)
    setIsPending(true)
    try {
      await unassignTicket(ticket.id)
      onUpdate()
    } catch (err: any) {
      setError(err.message || "Failed to unassign ticket")
    } finally {
      setIsPending(false)
    }
  }

  const handleAssign = () => {
    if (onAssign && selectedAssignee) {
      onAssign(ticket.id, selectedAssignee)
      setSelectedAssignee("")
    }
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

  const isAssignedToMe = () => false

  return (
    <div className="bg-[var(--surface-container)] rounded-2xl overflow-hidden hover:bg-[var(--surface-container-high)] transition-all">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4 flex items-start justify-between gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon className="w-4 h-4 shrink-0 text-[var(--primary)]" />
            <h4 className="text-sm font-bold text-[var(--on-surface)] truncate flex-1">
              {ticket.title}
            </h4>
          </div>
          <p className="text-xs text-[var(--on-surface-variant)]">
            {formatDate(ticket.created_at)}
            {ticket.events?.title && (
              <span className="ml-2">· {ticket.events.title}</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${priority.bg} ${priority.text}`}>
            {priority.label}
          </span>
          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${status.chipClass}`}>
            {status.label}
          </span>
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

          {ticket.assigned_profile?.full_name && (
            <div className="flex items-center gap-2 text-xs text-[var(--on-surface-variant)]">
              <User className="w-3.5 h-3.5" />
              Assigned to: <span className="font-bold">{ticket.assigned_profile.full_name}</span>
            </div>
          )}

          {ticket.profiles?.full_name && (
            <div className="flex items-center gap-2 text-xs text-[var(--on-surface-variant)]">
              <User className="w-3.5 h-3.5" />
              Reported by: <span className="font-bold">{ticket.profiles.full_name}</span>
            </div>
          )}

          {ticket.resolved_at && (
            <div className="flex items-center gap-2 text-xs text-green-500">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Resolved: {formatDate(ticket.resolved_at)}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-900/20 text-red-400 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            {mode === "manager" && !ticket.assigned_to && staffList.length > 0 && (
              <div className="flex gap-2">
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="flex-1 px-3 py-2 bg-surface-container-high rounded-xl text-sm border-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select staff...</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name}
                    </option>
                  ))}
                </select>
                <button
                onClick={handleAssign}
                  disabled={!selectedAssignee || isPending}
                  className="py-2 px-4 bg-[var(--primary)] text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  Assign
                </button>
              </div>
            )}
            {mode === "manager" && ticket.assigned_to && (
              <button
                onClick={handleUnassign}
                disabled={isPending}
                className="py-2 px-4 bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)] rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <User className="w-4 h-4" />
                {isPending ? "Unassigning..." : "Unassign"}
              </button>
            )}
            {(mode === "operations" || mode === "manager") && ticket.status === "open" && !ticket.assigned_to && (
              <button
                onClick={handleClaim}
                disabled={isPending}
                className="flex-1 py-2 px-4 bg-[var(--primary)] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <Handshake className="w-4 h-4" />
                {isPending ? "Claiming..." : "Claim This Ticket"}
              </button>
            )}
            {(mode === "operations" || mode === "manager") && ticket.status === "in_progress" && (
              <button
                onClick={handleComplete}
                disabled={isPending}
                className="flex-1 py-2 px-4 bg-green-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isPending ? "Completing..." : "Mark Resolved"}
              </button>
            )}
          </div>

          <div className="text-[10px] text-[var(--on-surface-variant)] opacity-50">
            ID: {ticket.id.slice(0, 8)}
          </div>
        </div>
      )}
    </div>
  )
}

interface TicketCardGroupProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  tickets: Ticket[]
  mode: "operations" | "manager"
  onRefresh: () => void
  empty?: string
  headerBg?: string
}

export function TicketCardGroup({ title, subtitle, icon, tickets, mode, onRefresh, empty, headerBg }: TicketCardGroupProps) {
  return (
    <div className="space-y-4">
      <div className={`flex items-center justify-between ${headerBg || ""}`}>
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="text-sm font-bold text-[var(--on-surface)]">{title}</h3>
            {subtitle && <p className="text-xs text-[var(--on-surface-variant)]">{subtitle}</p>}
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 rounded-full hover:bg-[var(--surface-container)] transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-[var(--primary)]" />
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-8 bg-[var(--surface-container-low)] rounded-2xl">
          <p className="text-sm text-[var(--on-surface-variant)]">{empty || "No tickets here."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} mode={mode} onUpdate={onRefresh} />
          ))}
        </div>
      )}
    </div>
  )
}