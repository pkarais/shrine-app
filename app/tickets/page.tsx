"use client"

export const dynamic = 'force-dynamic'

import { useEffect, useState, useTransition } from "react"
import { createClient } from "@/utils/supabase/client"
import { useRouter } from "next/navigation"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { Wrench, Clock, CheckCircle2, RefreshCw, Inbox, User, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { TicketCard, TicketCardGroup } from "@/components/shared/TicketCard"
import { MaintenanceTicketForm } from "@/components/forms/MaintenanceTicketForm"
import { getUnassignedTickets, getAssignedTickets, getUserTickets, getOperationsStaff, assignTicket, unassignTicket, claimTicket, completeTicket } from "@/lib/actions/tickets"

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

type UserRole = "manager" | "operations" | "security" | "council" | "staff" | "volunteer" | "visitor" | ""

export default function TicketsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"pool" | "assigned" | "my">("pool")
  const [assignedTickets, setAssignedTickets] = useState<Ticket[]>([])
  const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>([])
  const [myTickets, setMyTickets] = useState<Ticket[]>([])
  const [operationsStaff, setOperationsStaff] = useState<any[]>([])
  const [isPending, startTransition] = useTransition()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const filterTickets = (tickets: Ticket[]) => {
    if (!searchQuery.trim()) return tickets
    const q = searchQuery.toLowerCase()
    return tickets.filter((t) =>
      t.title?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.profiles?.full_name?.toLowerCase().includes(q) ||
      t.assigned_profile?.full_name?.toLowerCase().includes(q)
    )
  }

  const filteredPool = filterTickets(unassignedTickets)
  const filteredAssigned = filterTickets(assignedTickets)
  const filteredMy = filterTickets(myTickets)

  const fetchData = () => {
    setLoading(true)
    startTransition(async () => {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (!authUser) {
          router.push("/login")
          return
        }
        
        setUser(authUser)
        
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single()
        
        setProfile(profileData)
        
        const role = (profileData?.role || "").toLowerCase()
        
        const [assigned, unassigned, my, staff] = await Promise.all([
          getAssignedTickets(),
          getUnassignedTickets(),
          getUserTickets(50),
          role === "manager" ? getOperationsStaff() : Promise.resolve([])
        ])
        
        setAssignedTickets(assigned || [])
        setUnassignedTickets(unassigned || [])
        setMyTickets(my || [])
        setOperationsStaff(staff || [])
      } catch (err) {
        console.error("Error fetching data:", err)
        setFetchError("Failed to load tickets. Please try refreshing.")
      } finally {
        setLoading(false)
      }
    })
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleAssign = async (ticketId: string, assigneeId: string) => {
    try {
      await assignTicket(ticketId, assigneeId)
      fetchData()
    } catch (err: any) {
      alert(err.message || "Failed to assign ticket")
    }
  }

  const handleUnassign = async (ticketId: string) => {
    try {
      await unassignTicket(ticketId)
      fetchData()
    } catch (err: any) {
      alert(err.message || "Failed to unassign ticket")
    }
  }

  const handleClaim = async (ticketId: string) => {
    try {
      await claimTicket(ticketId)
      fetchData()
    } catch (err: any) {
      alert(err.message || "Failed to claim ticket")
    }
  }

  const handleComplete = async (ticketId: string) => {
    try {
      await completeTicket(ticketId)
      fetchData()
    } catch (err: any) {
      alert(err.message || "Failed to complete ticket")
    }
  }

  const handleTicketCreated = () => {
    setIsFormOpen(false)
    setIsCreating(false)
    fetchData()
  }

  const role = (profile?.role || "").toLowerCase()
  const isManager = role === "manager"
  const isOperations = role === "operations"
  const canCreateTicket = ["manager", "operations", "security", "council", "staff", "volunteer"].includes(role)

  if (loading) {
    return (
      <>
        <TopAppBar />
        <main className="max-w-2xl mx-auto px-4 pt-20 pb-24 min-h-screen">
          <div className="mb-6">
            <div className="w-56 h-8 bg-surface-container-high rounded-lg animate-pulse mb-2" />
            <div className="w-40 h-4 bg-surface-container-high rounded animate-pulse" />
          </div>
          <div className="flex gap-2 mb-6">
            <div className="w-36 h-10 bg-surface-container-high rounded-xl animate-pulse" />
            <div className="w-32 h-10 bg-surface-container-high rounded-xl animate-pulse" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-surface rounded-2xl p-4 animate-pulse">
                <div className="w-3/4 h-5 bg-surface-container-high rounded mb-3" />
                <div className="w-full h-3 bg-surface-container-high rounded mb-2" />
                <div className="w-2/3 h-3 bg-surface-container-high rounded mb-4" />
                <div className="flex gap-2">
                  <div className="w-16 h-6 bg-surface-container-high rounded-full" />
                  <div className="w-20 h-6 bg-surface-container-high rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <TopAppBar />
      <main className="max-w-2xl mx-auto px-4 pt-20 pb-24 min-h-screen">
        {fetchError && (
          <div className="mb-4 px-4 py-3 rounded-2xl border border-error-container bg-error-container text-on-error-container text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span>
            {fetchError}
            <button onClick={() => setFetchError(null)} className="ml-auto text-on-error-container/60 hover:text-on-error-container">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-on-surface flex items-center gap-2">
              <Wrench className="w-6 h-6 text-primary" />
              Maintenance Tickets
            </h1>
            <p className="text-sm text-on-surface-variant">
              {isManager ? "Manage and assign tickets" : isOperations ? "View and claim tickets" : "View your submitted tickets"}
            </p>
          </div>
          {canCreateTicket && (
            <Button onClick={() => { setIsFormOpen(true); setIsCreating(true); }} size="sm">
              <Plus className="w-4 h-4 mr-1" /> New Ticket
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tickets by title, description, or assignee..."
              className="w-full pl-10 pr-4 py-3 bg-surface-container-high rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant/60 outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {(isManager || isOperations) && (
            <button
              onClick={() => setActiveTab("pool")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                activeTab === "pool"
                  ? "bg-primary text-white"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <Inbox className="w-4 h-4" />
              Unassigned Pool
              {unassignedTickets.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {unassignedTickets.length}
                </span>
              )}
            </button>
          )}
          {isOperations && (
            <button
              onClick={() => setActiveTab("assigned")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
                activeTab === "assigned"
                  ? "bg-primary text-white"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <Clock className="w-4 h-4" />
              My Tickets
              {assignedTickets.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {assignedTickets.length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab("my")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-all whitespace-nowrap ${
              activeTab === "my"
                ? "bg-primary text-white"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            <User className="w-4 h-4" />
            My Submitted
            {myTickets.length > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {myTickets.length}
              </span>
            )}
          </button>
        </div>

        {/* Ticket List */}
        <div className="space-y-4">
          {activeTab === "pool" && (
            <>
              {filteredPool.length === 0 ? (
                <div className="text-center py-16 bg-surface-container-low rounded-2xl">
                  <Inbox className="w-12 h-12 mx-auto text-on-surface-variant opacity-30 mb-3" />
                  <p className="text-sm text-on-surface-variant font-medium">
                    {searchQuery ? "No matching tickets" : "No unassigned tickets"}
                  </p>
                  <p className="text-xs text-on-surface-variant opacity-60 mt-1">
                    {searchQuery ? "Try a different search term" : "All tickets have been assigned"}
                  </p>
                </div>
              ) : (
                filteredPool.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    mode={isManager ? "manager" : isOperations ? "operations" : "view"}
                    staffList={operationsStaff}
                    onAssign={isManager ? (id, assignee) => handleAssign(id, assignee) : undefined}
                    onClaim={isOperations ? (id) => handleClaim(id) : undefined}
                    onUpdate={fetchData}
                  />
                ))
              )}
            </>
          )}

          {activeTab === "assigned" && (
            <>
              {filteredAssigned.length === 0 ? (
                <div className="text-center py-16 bg-surface-container-low rounded-2xl">
                  <CheckCircle2 className="w-12 h-12 mx-auto text-on-surface-variant opacity-30 mb-3" />
                  <p className="text-sm text-on-surface-variant font-medium">
                    {searchQuery ? "No matching tickets" : "No tickets assigned to you"}
                  </p>
                  <p className="text-xs text-on-surface-variant opacity-60 mt-1">
                    {searchQuery ? "Try a different search term" : "Browse the unassigned pool to claim work"}
                  </p>
                </div>
              ) : (
                filteredAssigned.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    mode="operations"
                    onComplete={handleComplete}
                    onUpdate={fetchData}
                  />
                ))
              )}
            </>
          )}

          {activeTab === "my" && (
            <>
              {filteredMy.length === 0 ? (
                <div className="text-center py-16 bg-surface-container-low rounded-2xl">
                  <Wrench className="w-12 h-12 mx-auto text-on-surface-variant opacity-30 mb-3" />
                  <p className="text-sm text-on-surface-variant font-medium">
                    {searchQuery ? "No matching tickets" : "No tickets submitted"}
                  </p>
                  {canCreateTicket && !searchQuery && (
                    <Button onClick={() => { setIsFormOpen(true); setIsCreating(true); }} className="mt-4">
                      <Plus className="w-4 h-4 mr-1" /> Create First Ticket
                    </Button>
                  )}
                </div>
              ) : (
                filteredMy.map((ticket) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    mode="view"
                    onUpdate={fetchData}
                  />
                ))
              )}
            </>
          )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchData}
          disabled={isPending}
          className="fixed bottom-24 right-6 p-3 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-5 h-5 ${isPending ? "animate-spin" : ""}`} />
        </button>
      </main>

      {/* Ticket Form Modal */}
      {isFormOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-surface/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) { setIsFormOpen(false); setIsCreating(false); } }}
        >
          <div className="w-full max-w-xl card-surface rounded-[2rem] p-6 shadow-2xl relative">
            <button 
              onClick={() => { setIsFormOpen(false); setIsCreating(false); }} 
              className="absolute top-4 right-4 p-2 hover:bg-surface rounded-full z-[110]"
            >
              <span className="material-symbols-outlined font-bold">close</span>
            </button>
            <MaintenanceTicketForm onClose={handleTicketCreated} />
          </div>
        </div>
      )}
    </>
  )
}
