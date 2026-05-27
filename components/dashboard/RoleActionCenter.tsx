"use client"

import { useState, useEffect } from "react"
import { DailyWalkthrough } from "@/components/forms/DailyWalkthrough"
import { SecurityWalkthrough } from "@/components/forms/SecurityWalkthrough"
import { MaintenanceTicketForm } from "@/components/forms/MaintenanceTicketForm"
import { IncidentReport } from "@/components/forms/IncidentReport"
import { EventStaffing } from "@/components/shared/EventStaffing"
import { ChantStandCard } from "@/components/dashboard/ChantStandCard"
import { TicketList } from "@/components/dashboard/TicketList"
import { OperationsTicketDashboard } from "@/components/shared/OperationsTicketDashboard"
import { getUnassignedTickets, getTicketCounts } from "@/lib/actions/tickets"
import { 
  ClipboardCheck, 
  ShieldAlert, 
  PenTool, 
  Users, 
  Activity,
  CheckCircle2,
  Clock,
  Wrench,
  Inbox
} from "lucide-react"

interface RoleActionCenterProps {
  role: "operations" | "security" | "manager" | string
  profile: any
  event: any
  staffAssignments: any[]
  summary?: any
}

export function RoleActionCenter({ role, profile, event, staffAssignments, summary }: RoleActionCenterProps) {
  const [activeTab, setActiveTab] = useState<"action" | "team" | "ticket" | "history" | "workbench">("action")
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false)
  const [selectedWalkthrough, setSelectedWalkthrough] = useState<"facility" | "security">("facility")
  const [isIncidentOpen, setIsIncidentOpen] = useState(false)
  const [unassignedCount, setUnassignedCount] = useState(0)
  const [ticketCounts, setTicketCounts] = useState({ unassigned: 0, assignedToMe: 0, open: 0 })

  const isManager = role === "manager"
  const isSecurity = role === "security"
  const isOperations = role === "operations"
  const isStaff = isManager || isSecurity || isOperations

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [unassigned, counts] = await Promise.all([
          getUnassignedTickets(),
          getTicketCounts(),
        ])
        setUnassignedCount(unassigned?.length || 0)
        setTicketCounts(counts || { unassigned: 0, assignedToMe: 0, open: 0 })
      } catch (err) {
        console.error("Error fetching ticket counts:", err)
      }
    }
    if (isManager || isOperations) {
      fetchCounts()
    }
  }, [isManager, isOperations])

  return (
    <div className="card-surface p-8 space-y-8">
      {/* Tab Navigation */}
      <div className="flex gap-4 bg-surface-container-low p-2 rounded-2xl overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab("action")}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === "action" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container"
          }`}
        >
          <Activity className="w-4 h-4" />
          {isManager ? "Oversight" : "Action Center"}
        </button>
        <button 
          onClick={() => setActiveTab("team")}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === "team" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container"
          }`}
        >
          <Users className="w-4 h-4" />
          Who&apos;s Working
        </button>
        <button 
          onClick={() => setActiveTab("ticket")}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === "ticket" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container"
          }`}
        >
          <PenTool className="w-4 h-4" />
          Report Issue
        </button>
        <button 
          onClick={() => setActiveTab("history")}
          className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
            activeTab === "history" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container"
          }`}
        >
          <Clock className="w-4 h-4" />
          Record
        </button>
        {isOperations && (
          <button 
            onClick={() => setActiveTab("workbench")}
            className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${
              activeTab === "workbench" ? "bg-primary text-white" : "text-on-surface-variant hover:bg-surface-container"
            }`}
          >
            <Wrench className="w-4 h-4" />
            Workbench
          </button>
        )}
      </div>

      {/* Action Tab Content */}
      {activeTab === "action" && (
        <div 
          className="space-y-6 rounded-[2rem] overflow-hidden p-6 relative"
          style={{ backgroundImage: 'url(/images/oversight-hero.jpg)', backgroundSize: 'cover', backgroundPosition: 'top center', backgroundAttachment: 'fixed' }}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10">
          {(isOperations || isSecurity || isManager) && (
            <div className="grid grid-cols-1 gap-4">
              {(isOperations || isManager) && (
                <button 
                  onClick={() => { setSelectedWalkthrough("facility"); setIsWalkthroughOpen(true); }}
                  className="w-full p-6 bg-primary/5 rounded-[2rem] flex items-center justify-between group hover:opacity-80 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary rounded-xl text-white shadow-lg">
                      <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-lg text-primary">Facility Walkthrough</h4>
                      <p className="text-xs text-on-surface-variant font-medium">Standard facility opening/closing checks</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              )}

              {(isSecurity || isManager) && (
                <button 
                  onClick={() => { setSelectedWalkthrough("security"); setIsWalkthroughOpen(true); }}
                  className="w-full p-6 bg-on-surface/5 rounded-[2rem] flex items-center justify-between group hover:opacity-80 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-on-surface rounded-xl text-white shadow-lg">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-lg text-on-surface">Security Walkthrough</h4>
                      <p className="text-xs text-on-surface-variant font-medium">Perimeter and altar safety checks</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              )}

              <button 
                onClick={() => setIsIncidentOpen(true)}
                className="w-full p-6 bg-tertiary/5 rounded-[2rem] flex items-center justify-between group hover:bg-tertiary/10 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-tertiary rounded-xl text-white shadow-lg shadow-tertiary/20">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-bold text-lg text-tertiary">Incident Report</h4>
                    <p className="text-xs text-on-surface-variant font-medium">Document security, medical, or visitor events</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-tertiary group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
          )}

          {isManager && (
            <div className="space-y-6 pt-6 mt-6">
              <h3 className="headline-sm text-white flex items-center gap-2">
                Operations Oversight
                {unassignedCount > 0 && (
                  <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full backdrop-blur-sm">
                    {unassignedCount} unassigned
                  </span>
                )}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/70">Active Walkthroughs</span>
                    <Activity className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-white">{summary?.recentWalkthroughs?.length || 0} Recent</p>
                  <p className="text-xs text-white/60 mt-1">
                    Last: <span className="text-white font-bold">
                      {summary?.recentWalkthroughs?.[0]?.walkthrough_type || "N/A"}
                    </span>
                  </p>
                </div>
                <div className="p-4 bg-black/30 backdrop-blur-md rounded-2xl border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-white/70">Maintenance Tasks</span>
                    <ShieldAlert className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-white">{ticketCounts.open || 0} Open</p>
                  <p className="text-xs text-white/60 mt-1">
                    {unassignedCount > 0 ? (
                      <span className="text-white font-bold">{unassignedCount} unassigned</span>
                    ) : "All assigned"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {(isOperations || isSecurity) && (
            <div className="pt-6 mt-6 bg-surface-container-low/50 p-6 rounded-[2rem]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="headline-sm text-primary flex items-center gap-2">
                  Ticket Workbench
                  {ticketCounts.assignedToMe > 0 && (
                    <span className="px-2 py-0.5 bg-[var(--primary)] text-white text-xs rounded-full">
                      {ticketCounts.assignedToMe} assigned
                    </span>
                  )}
                </h3>
                {isOperations && (
                  <button 
                    onClick={() => setActiveTab("workbench")}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    View All →
                  </button>
                )}
              </div>
              {unassignedCount > 0 && (
                <button 
                  onClick={() => setActiveTab("workbench")}
                  className="w-full p-4 bg-surface-container rounded-2xl flex items-center justify-between hover:bg-surface-container-high transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Inbox className="w-5 h-5 text-tertiary" />
                    <div className="text-left">
                      <p className="font-bold text-on-surface">Unassigned Ticket Pool</p>
                      <p className="text-xs text-on-surface-variant">{unassignedCount} tickets available</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-primary">arrow_forward</span>
                </button>
              )}
              {unassignedCount === 0 && (
                <div className="text-center py-4 text-on-surface-variant text-sm">
                  No unassigned tickets in the pool
                </div>
              )}
            </div>
          )}

          {!isStaff && (
            <div className="space-y-12">
              <div className="space-y-6 text-center py-8">
                <h3 className="headline-sm text-primary">Visitor Center</h3>
                <p className="body-md text-on-surface-variant">Access operational staff lists or report facility issues.</p>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <button onClick={() => setActiveTab('team')} className="p-4 bg-surface-container rounded-2xl flex flex-col items-center gap-2">
                    <Users className="w-6 h-6 text-primary" />
                    <span className="text-[10px] font-bold uppercase">Staff List</span>
                  </button>
                  <button onClick={() => setActiveTab('ticket')} className="p-4 bg-surface-container rounded-2xl flex flex-col items-center gap-2">
                    <PenTool className="w-6 h-6 text-tertiary" />
                    <span className="text-[10px] font-bold uppercase">Report Issue</span>
                  </button>
                </div>
              </div>
              <ChantStandCard dcsLink={event?.dcs_link} />
            </div>
          )}
          </div>
        </div>
      )}

      {/* Team Tab Content */}
      {activeTab === "team" && (
        <div className="space-y-6">
          <h3 className="headline-sm text-primary flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Scheduled Team
          </h3>
          <EventStaffing staff={staffAssignments} />
        </div>
      )}

      {/* Ticket Tab Content */}
      {activeTab === "ticket" && (
        <div className="space-y-6">
          <MaintenanceTicketForm 
            eventId={event?.id} 
            onClose={() => setActiveTab("action")} 
          />
        </div>
      )}

      {/* History Tab Content */}
      {activeTab === "history" && (
        <TicketList onBack={() => setActiveTab("action")} />
      )}

      {/* Workbench Tab Content */}
      {activeTab === "workbench" && isOperations && (
        <div className="pt-2">
          <OperationsTicketDashboard />
        </div>
      )}

      {/* Form Modals */}
      {isWalkthroughOpen && (
        <div 
          className="fixed inset-0 z-[99999] bg-surface overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setIsWalkthroughOpen(false); }}
        >
          <div className="min-h-full flex items-center justify-center p-6">
            <div className="w-full max-w-2xl bg-white rounded-[2rem] p-8 shadow-2xl relative my-8">
              <button onClick={() => setIsWalkthroughOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-surface rounded-full z-[110]">
                <span className="material-symbols-outlined font-bold">close</span>
              </button>
              {selectedWalkthrough === "facility" ? (
                <DailyWalkthrough eventId={event?.id} onClose={() => setIsWalkthroughOpen(false)} />
              ) : (
                <SecurityWalkthrough eventId={event?.id} onClose={() => setIsWalkthroughOpen(false)} />
              )}
            </div>
          </div>
        </div>
      )}

      {isIncidentOpen && (
        <div 
          className="fixed inset-0 z-[99999] bg-surface overflow-y-auto"
          onClick={(e) => { if (e.target === e.currentTarget) setIsIncidentOpen(false); }}
        >
          <div className="min-h-full flex items-center justify-center p-6">
            <div className="w-full max-w-4xl bg-white rounded-[2rem] p-8 shadow-2xl relative my-8">
              <button onClick={() => setIsIncidentOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-surface rounded-full z-[110]">
                <span className="material-symbols-outlined font-bold">close</span>
              </button>
              <div className="py-2">
                <h3 className="headline-md text-primary mb-6">Incident Report Form</h3>
                <IncidentReport eventId={event?.id} onClose={() => setIsIncidentOpen(false)} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
