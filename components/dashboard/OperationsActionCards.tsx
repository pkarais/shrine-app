"use client"

import { useMemo, useState } from "react"
import { DailyWalkthrough } from "@/components/forms/DailyWalkthrough"
import { SecurityWalkthrough } from "@/components/forms/SecurityWalkthrough"
import { IncidentReport } from "@/components/forms/IncidentReport"

type WalkthroughUpdate = {
  walkthrough_type?: string | null
  category?: string | null
  completed_at?: string | null
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
                <div key={`${item.completed_at || idx}-${idx}`} className="bg-surface-container-low rounded-xl p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">
                      {item.walkthrough_type || "Walkthrough Completed"}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {item.completed_at ? new Date(item.completed_at).toLocaleString() : "Time not available"}
                    </p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full ${isSecurity ? "bg-tertiary-fixed text-on-tertiary-fixed" : "bg-primary-fixed text-on-primary-fixed"}`}>
                    {isSecurity ? "Security" : "Operations"}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">No walkthrough updates yet.</p>
        )}
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-[100] bg-surface/80 backdrop-blur-md flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-[2rem] p-8 shadow-2xl relative">
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
      )}
    </section>
  )
}
