"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, ExternalLink, BookOpen, Cross } from "lucide-react"

function getTodayDCSUrl(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `https://dcs.goarch.org/goa/dcs/indexes/${year}${month}${day}.html`
}

function getEventEndTime(startTimeIso: string, endTimeIso?: string | null): Date {
  if (endTimeIso) return new Date(endTimeIso)
  return new Date(new Date(startTimeIso).getTime() + 60 * 60 * 1000)
}

export function DailyBrief({ event }: { event: any }) {
  const [showChapel, setShowChapel] = useState(false)
  const [showDCS, setShowDCS] = useState(false)

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  const dcsUrl = getTodayDCSUrl()

  if (!event) return (
    <section className="card-surface p-8">
      <p className="text-xs label-text text-[var(--secondary)] mb-2">Daily Briefing</p>
      <h2 className="headline-sm text-[var(--on-surface)]">{today}</h2>
      <p className="body-md mt-1">No events scheduled. The calendar is clear.</p>
      <div className="mt-4 flex gap-3 flex-wrap">
        <a
          href="https://www.goarch.org/chapel"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)] hover:underline"
        >
          <Cross className="w-4 h-4" /> GOA Chapel
          <ExternalLink className="w-3 h-3" />
        </a>
        <a
          href={dcsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--primary)] hover:underline"
        >
          <BookOpen className="w-4 h-4" /> Digital Chant Stand
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </section>
  )

  const isMajorFeast = event.category === "major_feast"
  const hasStart = Boolean(event?.start_time)
  const startCandidate = hasStart ? new Date(event.start_time) : null
  const start = startCandidate && !Number.isNaN(startCandidate.getTime()) ? startCandidate : null
  const endCandidate = start ? getEventEndTime(event.start_time, event.end_time) : null
  const end = endCandidate && !Number.isNaN(endCandidate.getTime()) ? endCandidate : null

  return (
    <section className="card-surface p-8 space-y-4">
      <p className="text-xs label-text text-[var(--secondary)]">Daily Briefing</p>
      <div className="flex justify-between items-start">
        <h2 className="display-md text-[var(--on-surface)]">{event.title}</h2>
        {isMajorFeast && (
          <span className="badge-feast">Major Feast</span>
        )}
      </div>
      {start && end ? (
        <p className="body-sm text-[var(--on-surface-variant)]">
          {start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {` - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
        </p>
      ) : null}
      <p className="body-md">
        {isMajorFeast
          ? `Staffing: ${event.required_ops} ops · ${event.required_security} security · ${event.required_greeter} greeters`
          : "Regular staffing schedule."}
      </p>

      <div className="space-y-2 pt-2">
        <a
          href="https://www.goarch.org/chapel"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between p-3 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] transition-colors text-left no-underline"
        >
          <span className="text-sm font-semibold text-[var(--on-surface)] flex items-center gap-2">
            <Cross className="w-4 h-4 text-[var(--tertiary)]" />
            Today&apos;s GOA Chapel Readings
          </span>
          <ExternalLink className="w-4 h-4 text-[var(--on-surface-variant)]" />
        </a>

        <button
          onClick={() => setShowDCS(!showDCS)}
          className="w-full flex items-center justify-between p-3 rounded-lg bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] transition-colors text-left"
        >
          <span className="text-sm font-semibold text-[var(--on-surface)] flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-[var(--primary)]" />
            Digital Chant Stand — {today}
          </span>
          {showDCS ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showDCS && (
          <div className="rounded-lg overflow-hidden border border-[var(--outline-variant)]/15">
            <iframe
              src={dcsUrl}
              title="GOA Digital Chant Stand"
              className="w-full h-[600px] bg-white"
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          </div>
        )}
      </div>
    </section>
  )
}
