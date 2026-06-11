"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function SyncCalendarButton() {
  const router = useRouter()
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [detail, setDetail] = useState("")

  const handleSync = async () => {
    setStatus("loading")
    setDetail("")
    try {
      const res = await fetch("/api/sync-calendar")
      const json = await res.json()
      if (json.success) {
        setStatus("success")
        setDetail(`${json.synced} of ${json.total} events synced`)
        router.refresh()
      } else {
        setStatus("error")
        setDetail(json.error || "Sync failed")
      }
    } catch (err: any) {
      setStatus("error")
      setDetail(err.message || "Network error")
    } finally {
      setTimeout(() => setStatus("idle"), 4000)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={status === "loading"}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-label text-sm font-medium transition-all
          ${status === "loading"
            ? "bg-surface-container text-on-surface-variant cursor-not-allowed"
            : status === "success"
            ? "bg-secondary-container text-on-secondary-container"
            : status === "error"
            ? "bg-error-container text-on-error-container"
            : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant"
          }`}
      >
        <span
          className={`material-symbols-outlined text-[18px] ${status === "loading" ? "animate-spin" : ""}`}
          style={status === "loading" ? { animationDuration: "1s" } : {}}
        >
          {status === "loading" ? "sync" : status === "success" ? "check_circle" : status === "error" ? "error" : "cloud_sync"}
        </span>
        {status === "loading" ? "Syncing…" : status === "success" ? "Synced" : status === "error" ? "Failed" : "Sync Google Calendar"}
      </button>
      {detail && (
        <span className={`text-xs font-body ${status === "error" ? "text-error" : "text-on-surface-variant"}`}>
          {detail}
        </span>
      )}
    </div>
  )
}
