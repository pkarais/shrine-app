"use client"

import { useMemo, useState } from "react"
import { DailyWalkthrough } from "@/components/forms/DailyWalkthrough"
import { SecurityWalkthrough } from "@/components/forms/SecurityWalkthrough"
import { IncidentReport } from "@/components/forms/IncidentReport"
import { User } from "lucide-react"

type WalkthroughUpdate = {
  id?: string | null
  walkthrough_type?: string | null
  category?: string | null
  completed_at?: string | null
  user_id?: string | null
  user_name?: string | null
}

export function OperationsActionCards({
  eventId,
  recentWalkthroughs,
  role,
}: {
  eventId?: number | null
  recentWalkthroughs: WalkthroughUpdate[]
  role?: string | null
}) {
  const [activeModal, setActiveModal] = useState<null | "incident" | "ops" | "security">(null)
  const [selectedWalkthrough, setSelectedWalkthrough] = useState<WalkthroughUpdate | null>(null)
  const isManager = (role || "").toLowerCase() === "manager"
  const isSecurity = (role || "").toLowerCase() === "security"

  const updates = useMemo(() => {
    return (recentWalkthroughs || []).slice(0, 6)
  }, [recentWalkthroughs])

  return (
    <section className="space-y-4">
      <div className={`grid grid-cols-1 gap-4 ${isManager ? "md:grid-cols-1" : isSecurity ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        <button
          onClick={() => setActiveModal("incident")}
          className="card-surface p-5 text-left hover:bg-surface-container-low transition-colors"
        >
          <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-2">Incident</p>
          <h3 className="font-headline text-xl text-tertiary font-bold">Submit Incident Report</h3>
          <p className="text-sm text-on-surface-variant mt-2">Document security, medical, or visitor issues.</p>
        </button>

        {!isManager && !isSecurity ? (
          <>
            <button
              onClick={() => setActiveModal("ops")}
              className="card-surface p-5 text-left hover:bg-surface-container-low transition-colors"
            >
              <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-2">Operations</p>
              <h3 className="font-headline text-xl text-primary font-bold">Start Ops Walkthrough</h3>
              <p className="text-sm text-on-surface-variant mt-2">Run opening and facility checks.</p>
            </button>
          </>
        ) : null}

        {!isManager && isSecurity ? (
          <>
            <button
              onClick={() => setActiveModal("security")}
              className="card-surface p-5 text-left hover:bg-surface-container-low transition-colors"
            >
              <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-2">Security</p>
              <h3 className="font-headline text-xl text-primary font-bold">Start Security Walkthrough</h3>
              <p className="text-sm text-on-surface-variant mt-2">Run perimeter and access control checks.</p>
            </button>
          </>
        ) : null}
      </div>

      <div className="card-surface p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-headline text-xl font-bold text-primary">Walkthrough Updates</h3>
          <span className="text-xs uppercase tracking-widest text-on-surface-variant">Latest Activity</span>
        </div>

        {updates.length > 0 ? (
          <div className="space-y-3">
            {updates.map((item, idx) => {
              const kind = (item.category || item.walkthrough_type || "general").toLowerCase()
              const isSecurity = kind.includes("security")

              return (
                <button
                  key={`${item.completed_at || idx}-${idx}`}
                  onClick={() => setSelectedWalkthrough(item)}
                  className="w-full bg-surface-container-low rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-surface-container transition-colors text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">
                      {item.walkthrough_type === "opening" ? "Opening" : item.walkthrough_type === "closing" ? "Closing" : "Walkthrough"} Walkthrough
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {item.completed_at ? new Date(item.completed_at).toLocaleString() : "Time not available"}
                    </p>
                    {item.user_name && (
                      <p className="text-[10px] text-on-surface-variant mt-0.5 flex items-center gap-1">
                        <User className="w-3 h-3" /> {item.user_name}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${kind.includes("security") ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-primary-fixed text-on-primary-fixed"}`}>
                    {kind.includes("security") ? "Security" : "Operations"}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">No walkthrough updates yet.</p>
        )}
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[99999] bg-surface overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-6">
            <div className="w-full max-w-4xl bg-surface-container-lowest dark:bg-surface-container rounded-[2rem] p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-6 right-6 p-2 hover:bg-surface rounded-full"
              aria-label="Close"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            {activeModal === "incident" ? (
              <IncidentReport eventId={eventId || null} onClose={() => setActiveModal(null)} />
            ) : null}
            {activeModal === "ops" ? (
              <DailyWalkthrough eventId={eventId || null} onClose={() => setActiveModal(null)} />
            ) : null}
            {activeModal === "security" ? (
              <SecurityWalkthrough eventId={eventId || null} onClose={() => setActiveModal(null)} />
            ) : null}
          </div>
          </div>
        </div>
      )}

      {selectedWalkthrough && (
        <div
          className="fixed inset-0 z-[99999] bg-surface overflow-y-auto"
          onClick={() => setSelectedWalkthrough(null)}
        >
          <div className="min-h-full flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-surface-container-lowest dark:bg-surface-container rounded-[2rem] p-8 shadow-2xl relative my-8">
              <button
                onClick={() => setSelectedWalkthrough(null)}
                className="absolute top-6 right-6 p-2 hover:bg-surface rounded-full"
              >
                <span className="material-symbols-outlined font-bold">close</span>
              </button>
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">Walkthrough</p>
                  <h3 className="text-xl font-bold text-on-surface mt-1">
                    {selectedWalkthrough.walkthrough_type === "opening" ? "Opening" : "Closing"} Walkthrough
                  </h3>
                </div>
                <div className="bg-surface-container-low rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Category</span>
                    <span className="font-semibold text-on-surface capitalize">{selectedWalkthrough.category || "facility"}</span>
                  </div>
                  {selectedWalkthrough.user_name && (
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Completed by</span>
                      <span className="font-semibold text-on-surface">{selectedWalkthrough.user_name}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">Completed at</span>
                    <span className="font-semibold text-on-surface">
                      {selectedWalkthrough.completed_at
                        ? new Date(selectedWalkthrough.completed_at).toLocaleString()
                        : "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
