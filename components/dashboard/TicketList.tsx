"use client"

import { useEffect, useState, useTransition } from "react"
import { Wrench, Clock, CheckCircle2, AlertTriangle, User, RefreshCw } from "lucide-react"
import { getUserTickets } from "@/lib/actions/tickets"
import { Button } from "@/components/ui/Button"

type Ticket = {
  id: string
  title: string
  description: string
  priority: "low" | "medium" | "high" | "urgent"
  status: string
  created_at: string
  resolved_at?: string | null
  assigned_to?: string | null
  events?: { title: string } | null
  profiles?: { full_name?: string; email?: string } | null
}

const priorityConfig: Record<string, { color: string; label: string }> = {
  low: { color: "bg-[var(--surface-container)] text-[var(--primary)]", label: "Low" },
  medium: { color: "bg-[var(--secondary-container)] text-[var(--secondary)]", label: "Medium" },
  high: { color: "bg-[var(--tertiary-container)] text-[var(--on-tertiary-container)]", label: "High" },
  urgent: { color: "bg-tertiary-container text-on-tertiary-container", label: "Urgent" },
}

const statusConfig: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  open: { icon: Clock, color: "text-[var(--primary)]", label: "Open" },
  in_progress: { icon: Wrench, color: "text-[var(--secondary)]", label: "In Progress" },
  resolved: { icon: CheckCircle2, color: "text-green-500", label: "Resolved" },
  closed: { icon: CheckCircle2, color: "text-[var(--on-surface-variant)]", label: "Closed" },
}

export function TicketList({ onBack }: { onBack?: () => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const fetchTickets = () => {
    setLoading(true)
    setError(null)
    startTransition(async () => {
      try {
        const data = await getUserTickets(50)
        setTickets(data || [])
      } catch (err: any) {
        setError(err.message || "Failed to load tickets")
      } finally {
        setLoading(false)
      }
    })
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[var(--on-surface-variant)] font-medium">Loading tickets…</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="headline-sm text-[var(--on-surface)] flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[var(--primary)]" />
            Maintenance Tickets
          </h3>
          <p className="text-xs text-[var(--on-surface-variant)] mt-1">
            {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTickets}
            disabled={isPending}
            className="p-2 rounded-full hover:bg-[var(--surface-container)] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-[var(--primary)] ${isPending ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-error-container text-on-error-container rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Ticket List */}
      {tickets.length === 0 ? (
        <div className="text-center py-12 bg-[var(--surface-container-low)] rounded-2xl">
          <Wrench className="w-10 h-10 mx-auto text-[var(--on-surface-variant)] opacity-30 mb-3" />
          <p className="text-sm text-[var(--on-surface-variant)]">No tickets submitted yet.</p>
          <p className="text-xs text-[var(--on-surface-variant)] opacity-60 mt-1">
            Use the &quot;Report Issue&quot; tab to create your first ticket.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const priority = priorityConfig[ticket.priority] || priorityConfig.low
            const status = statusConfig[ticket.status] || statusConfig.open
            const StatusIcon = status.icon
            const isExpanded = expandedId === ticket.id

            return (
              <button
                key={ticket.id}
                onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                className="w-full text-left p-4 bg-[var(--surface-container)] rounded-2xl hover:bg-[var(--surface-container-high)] transition-all group"
              >
                {/* Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon className={`w-4 h-4 shrink-0 ${status.color}`} />
                      <h4 className="text-sm font-bold text-[var(--on-surface)] truncate">
                        {ticket.title}
                      </h4>
                    </div>
                    <p className="text-xs text-[var(--on-surface-variant)]">
                      {formatDate(ticket.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${priority.color}`}>
                      {priority.label}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-[var(--on-surface-variant)] bg-[var(--surface-container-low)] px-2 py-1 rounded-md">
                      {status.label}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-[var(--outline-variant)]/20 space-y-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
                        Description
                      </span>
                      <p className="text-sm text-[var(--on-surface)] mt-1 whitespace-pre-wrap">
                        {ticket.description}
                      </p>
                    </div>

                    {ticket.events?.title && (
                      <div className="flex items-center gap-2 text-xs text-[var(--on-surface-variant)]">
                        <span className="material-symbols-outlined text-sm">event</span>
                        Linked Event: <span className="font-bold text-[var(--primary)]">{ticket.events.title}</span>
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

                    <div className="flex items-center gap-2 text-[10px] text-[var(--on-surface-variant)] opacity-60">
                      ID: {ticket.id.slice(0, 8)}
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Back button */}
      {onBack && (
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full mt-4"
        >
          ← Back to Action Center
        </Button>
      )}
    </div>
  )
}
