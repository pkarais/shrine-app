"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type Suggestion = {
  id: string
  eventTitle: string
  excessHours: number
}

export function ShiftOptimizerPanel({
  initialEstimatedSavings,
  initialSuggestions,
}: {
  initialEstimatedSavings: number
  initialSuggestions: Suggestion[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [estimatedSavings, setEstimatedSavings] = useState<number>(initialEstimatedSavings)
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initialSuggestions)
  const [status, setStatus] = useState<string | null>(null)

  const optimizeShifts = () => {
    setStatus(null)
    startTransition(async () => {
      try {
        const provider = localStorage.getItem("shrine_ai_provider") || "none"
        const apiKey = localStorage.getItem("shrine_ai_key") || ""
        const response = await fetch("/api/manager/optimizer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ provider, apiKey: provider !== "none" ? apiKey : undefined }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload?.error || "Unable to run optimizer")
        }

        const payload = await response.json()
        setEstimatedSavings(Number(payload.estimatedSavings || 0))
        setSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions : [])
        setStatus("Optimizer updated with latest shift recommendations.")
      } catch (error: any) {
        setStatus(error?.message || "Failed to run optimizer.")
      }
    })
  }

  const openManualOverhaul = () => {
    window.location.href = "/calendar"
  }

  return (
    <section className="bg-primary text-white rounded-2xl p-8 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container blur-[100px] opacity-40 -mr-32 -mt-32" />
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <h3 className="text-3xl font-headline font-extrabold leading-tight">Shift Scheduling<br />AI Optimizer</h3>
          <p className="text-on-primary-container text-lg">
            Predictive workload balancing has identified <span className="text-secondary-container font-bold">${estimatedSavings.toFixed(2)}</span> in potential overtime savings.
          </p>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={optimizeShifts}
              disabled={isPending}
              className="bg-secondary text-on-secondary px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform flex items-center gap-2 disabled:opacity-60 disabled:hover:scale-100"
            >
              <span className="material-symbols-outlined">auto_awesome</span>
              {isPending ? "Optimizing..." : "Optimize Shifts"}
            </button>
            <button
              onClick={openManualOverhaul}
              className="border border-white/20 px-8 py-3 rounded-xl font-bold hover:bg-white/10 transition-colors"
            >
              Manual Overhaul
            </button>
          </div>
          {status ? <p className="text-sm text-on-primary-container">{status}</p> : null}
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="text-sm font-bold">Potential Savings</span>
            <span className="text-secondary-container font-headline font-bold">${estimatedSavings.toFixed(2)}</span>
          </div>
          <div className="space-y-3">
            {suggestions.length > 0 ? (
              suggestions.slice(0, 3).map((suggestion) => (
                <div key={suggestion.id} className="flex items-center gap-4 text-xs">
                  <div className="w-2 h-2 rounded-full bg-error" />
                  <span className="flex-1">Overtime: {suggestion.eventTitle || "Unknown Event"}</span>
                  <span className="font-bold">+{suggestion.excessHours.toFixed(1)}h</span>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-4 text-xs">
                <div className="w-2 h-2 rounded-full bg-secondary-container" />
                <span className="flex-1">No overtime issues detected</span>
                <span className="font-bold">0.0h</span>
              </div>
            )}
          </div>
          <div className="pt-4 flex justify-center">
            <span className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold">Auto-Adjustment Ready</span>
          </div>
        </div>
      </div>
    </section>
  )
}
