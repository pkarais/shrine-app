"use client"

import { useState, useTransition } from "react"
import { archiveAndClear, type ArchiveScope } from "@/lib/actions/archive"

type Stats = {
  live: { messages: number; group_messages: number; incidents: number }
  archived: { messages: number; group_messages: number; incidents: number }
  last_run: { triggered_at: string; rows_archived: number; scope: string } | null
}

export function ArchiveControls({ initialStats }: { initialStats: Stats }) {
  const [stats, setStats] = useState<Stats>(initialStats)
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [confirming, setConfirming] = useState<ArchiveScope | null>(null)

  async function run(scope: ArchiveScope) {
    setConfirming(null)
    setMessage(null)
    startTransition(async () => {
      try {
        const result = await archiveAndClear(scope)
        const { counts, total } = result
        setMessage(
          total === 0
            ? `No rows to archive — everything is already current.`
            : `Archived ${total} rows (messages: ${counts.messages}, group: ${counts.group_messages}, incidents: ${counts.incidents}).`,
        )
        // Refresh stats from server values applied to live counts (live - archived)
        setStats((prev) => ({
          live: {
            messages: Math.max(0, prev.live.messages - counts.messages),
            group_messages: Math.max(0, prev.live.group_messages - counts.group_messages),
            incidents: Math.max(0, prev.live.incidents - counts.incidents),
          },
          archived: {
            messages: prev.archived.messages + counts.messages,
            group_messages: prev.archived.group_messages + counts.group_messages,
            incidents: prev.archived.incidents + counts.incidents,
          },
          last_run: {
            triggered_at: new Date().toISOString(),
            rows_archived: total,
            scope,
          },
        }))
      } catch (err: any) {
        setMessage(`Failed: ${err?.message || "unknown error"}`)
      }
    })
  }

  const lastRun = stats.last_run
    ? new Date(stats.last_run.triggered_at).toLocaleString([], {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "never"

  return (
    <div className="md:col-span-2 lg:col-span-2 bg-surface-container-low rounded-xl p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-headline font-bold text-xl text-on-surface">Archive &amp; Clear</h3>
          <p className="text-on-surface-variant text-sm">
            Push messages, group chats, and incidents older than today into the archive so the live view starts fresh.
          </p>
        </div>
        <span className="badge-task">Daily</span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <Stat label="Direct messages" live={stats.live.messages} archived={stats.archived.messages} />
        <Stat label="Group messages" live={stats.live.group_messages} archived={stats.archived.group_messages} />
        <Stat label="Incidents" live={stats.live.incidents} archived={stats.archived.incidents} />
      </div>

      <p className="text-xs text-on-surface-variant">
        Cutoff: end of yesterday (Eastern). Today&apos;s items stay live. Last run: <strong>{lastRun}</strong>
        {stats.last_run ? ` — ${stats.last_run.rows_archived} rows (${stats.last_run.scope})` : ""}
      </p>

      <div className="flex flex-wrap gap-2 pt-1">
        <ScopeButton
          scope="messages" label="Archive messages"
          confirming={confirming} setConfirming={setConfirming}
          onRun={run} pending={pending}
        />
        <ScopeButton
          scope="group_messages" label="Archive group chats"
          confirming={confirming} setConfirming={setConfirming}
          onRun={run} pending={pending}
        />
        <ScopeButton
          scope="incidents" label="Archive incidents"
          confirming={confirming} setConfirming={setConfirming}
          onRun={run} pending={pending}
        />
        <ScopeButton
          scope="all" label="Archive everything"
          confirming={confirming} setConfirming={setConfirming}
          onRun={run} pending={pending}
          primary
        />
      </div>

      {message ? (
        <p className="text-xs text-on-surface mt-1 p-2 rounded bg-surface-container">{message}</p>
      ) : null}
    </div>
  )
}

function Stat({ label, live, archived }: { label: string; live: number; archived: number }) {
  return (
    <div className="bg-surface-container rounded-lg p-3">
      <p className="text-[10px] uppercase tracking-wide text-on-surface-variant font-bold">{label}</p>
      <p className="text-2xl font-display font-bold text-on-surface mt-1">{live}</p>
      <p className="text-[10px] text-on-surface-variant">live · {archived} archived</p>
    </div>
  )
}

function ScopeButton({
  scope, label, confirming, setConfirming, onRun, pending, primary,
}: {
  scope: ArchiveScope
  label: string
  confirming: ArchiveScope | null
  setConfirming: (s: ArchiveScope | null) => void
  onRun: (s: ArchiveScope) => void
  pending: boolean
  primary?: boolean
}) {
  const isConfirming = confirming === scope
  if (isConfirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => onRun(scope)}
          disabled={pending}
          className="btn-danger px-3 py-2 text-xs disabled:opacity-50"
        >
          {pending ? "Working…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(null)}
          disabled={pending}
          className="btn-secondary px-3 py-2 text-xs"
        >
          Cancel
        </button>
      </div>
    )
  }
  return (
    <button
      onClick={() => setConfirming(scope)}
      disabled={pending}
      className={`${primary ? "btn-primary" : "btn-secondary"} px-3 py-2 text-xs disabled:opacity-50`}
    >
      {label}
    </button>
  )
}
