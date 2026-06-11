"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/utils/supabase/client"

type VisitorRow = {
  count: number
  recorded_at: string
}

export function RunningVisitorCountCard({ initialRows }: { initialRows: VisitorRow[] }) {
  const supabase = useMemo(() => createClient(), [])
  const [latestCount, setLatestCount] = useState(0)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const getTodayKey = (value: string | Date) => {
    const date = new Date(value)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  useEffect(() => {
    const todayKey = getTodayKey(new Date())
    const todayRows = (initialRows || [])
      .filter((row) => getTodayKey(row.recorded_at) === todayKey)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())

    const latest = todayRows[todayRows.length - 1]
    if (latest) {
      setLatestCount(Number(latest.count || 0))
      setLastUpdated(latest.recorded_at)
    } else {
      setLatestCount(0)
      setLastUpdated(null)
    }
  }, [initialRows])

  useEffect(() => {
    const channel = supabase
      .channel("council-visitor-count")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "visitor_volume" },
        (payload: any) => {
          const row = payload?.new
          if (!row?.recorded_at) return

          if (getTodayKey(row.recorded_at) !== getTodayKey(new Date())) return

          setLatestCount(Number(row.count || 0))
          setLastUpdated(row.recorded_at)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  return (
    <section className="card-surface p-8">
      <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant mb-2">Visitor Count</p>
      <h2 className="font-headline text-3xl font-extrabold text-primary mb-2">Running Count Today</h2>
      <div className="text-6xl font-headline font-black text-primary leading-none mt-4">{latestCount}</div>
      <p className="text-sm text-on-surface-variant mt-4">
        {lastUpdated
          ? `Last updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
          : "No visitor updates recorded yet today."}
      </p>
    </section>
  )
}
