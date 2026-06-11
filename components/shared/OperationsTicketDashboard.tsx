"use client"

import { useEffect, useState } from "react"
import { Clock, Wrench, CheckCircle2, RefreshCw, Users as Handshake, Inbox } from "lucide-react"
import { getAssignedTickets, getUnassignedTickets } from "@/lib/actions/tickets"
import { TicketCard, TicketCardGroup } from "@/components/shared/TicketCard"

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

type ActiveTab = "assigned" | "pool"

export function OperationsTicketDashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("assigned")
  const [assignedTickets, setAssignedTickets] = useState<Ticket[]>([])
  const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchAll = async () => {
    setLoading(true)
    setError(null)
    try {
      const [assigned, unassigned] = await Promise.all([
        getAssignedTickets(),
        getUnassignedTickets(),
      ])
      setAssignedTickets(assigned || [])
      setUnassignedTickets(unassigned || [])
    } catch (err: any) {
      setError(err.message || "Failed to load tickets")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAll()
  }, [])

  const inProgressCount = assignedTickets.filter((t) => t.status === "in_progress").length
  const openCount = assignedTickets.filter((t) => t.status === "open").length

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-3 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--on-surface-variant)]">Loading your tickets...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-display-sm text-on-surface">Ticket Workbench</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Claim unassigned tickets or complete your assigned ones
          </p>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="p-3 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors"
          title="Refresh all"
        >
          <RefreshCw className={`w-5 h-5 text-primary ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 text-red-400 rounded-xl text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setActiveTab("assigned")}
          className={`p-4 rounded-2xl text-left transition-all ${
            activeTab === "assigned"
              ? "bg-[var(--primary)] text-white shadow-lg"
              : "bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)]"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Wrench className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">
              My Tickets
            </span>
          </div>
          <p className="text-2xl font-extrabold">
            {inProgressCount}
            <span className="text-base font-normal opacity-60 ml-1">
              In Progress
            </span>
          </p>
          {openCount > 0 && (
            <p className="text-xs mt-1 opacity-80">
              {openCount} open / awaiting action
            </p>
          )}
        </button>

        <button
          onClick={() => setActiveTab("pool")}
          className={`p-4 rounded-2xl text-left transition-all ${
            activeTab === "pool"
              ? "bg-[var(--secondary)] text-white shadow-lg"
              : "bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)]"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Inbox className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wide">
              Unassigned Pool
            </span>
          </div>
          <p className="text-2xl font-extrabold">
            {unassignedTickets.length}
            <span className="text-base font-normal opacity-60 ml-1">
              Available
            </span>
          </p>
        </button>
      </div>

      <div className="space-y-6">
        {activeTab === "assigned" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-[var(--primary)]" />
              <h3 className="text-sm font-bold text-[var(--on-surface)]">
                My Assigned Tickets
              </h3>
            </div>

            {assignedTickets.length === 0 ? (
              <div className="text-center py-12 bg-[var(--surface-container-low)] rounded-2xl">
                <CheckCircle2 className="w-10 h-10 mx-auto text-[var(--on-surface-variant)] opacity-30 mb-3" />
                <p className="text-sm text-[var(--on-surface-variant)] font-medium">
                  No tickets assigned to you
                </p>
                <p className="text-xs text-[var(--on-surface-variant)] opacity-60 mt-1">
                  Browse the unassigned pool to claim work
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignedTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    mode="operations"
                    onUpdate={fetchAll}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-[var(--secondary)]" />
              <h3 className="text-sm font-bold text-[var(--on-surface)]">
                Unassigned Ticket Pool
              </h3>
            </div>

            {unassignedTickets.length === 0 ? (
              <div className="text-center py-12 bg-[var(--surface-container-low)] rounded-2xl">
                <Inbox className="w-10 h-10 mx-auto text-[var(--on-surface-variant)] opacity-30 mb-3" />
                <p className="text-sm text-[var(--on-surface-variant)] font-medium">
                  No unassigned tickets
                </p>
                <p className="text-xs text-[var(--on-surface-variant)] opacity-60 mt-1">
                  All tickets have been assigned
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {unassignedTickets.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    mode="operations"
                    onUpdate={fetchAll}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}