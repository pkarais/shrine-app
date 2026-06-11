"use client"

import { useState, useTransition } from "react"
import { updateShiftLocationType } from "@/lib/actions/manager-hours"

interface Props {
  shiftId: string
  current: "onsite" | "offsite"
}

export function LocationTypeToggle({ shiftId, current }: Props) {
  const [value, setValue] = useState<"onsite" | "offsite">(current)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const toggle = () => {
    const next = value === "onsite" ? "offsite" : "onsite"
    setError(null)
    setValue(next) // optimistic
    startTransition(async () => {
      const res = await updateShiftLocationType(shiftId, next)
      if (!res.success) {
        setValue(value) // revert
        setError(res.error || "Failed to update")
      }
    })
  }

  const isOffsite = value === "offsite"

  return (
    <div className="inline-flex flex-col items-start gap-0.5">
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        title="Click to toggle on-site / off-site"
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition ${
          isOffsite
            ? "bg-secondary/20 text-secondary hover:bg-secondary/30"
            : "bg-primary/20 text-primary hover:bg-primary/30"
        } ${isPending ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
      >
        <span className="material-symbols-outlined text-sm">
          {isOffsite ? "home_work" : "location_on"}
        </span>
        {isOffsite ? "Off-Site" : "On-Site"}
      </button>
      {error && <span className="text-[10px] text-error">{error}</span>}
    </div>
  )
}
