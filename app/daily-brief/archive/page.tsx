"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { getDailyBriefArchive } from "@/lib/actions/daily-brief"
import { FileText, CalendarDays, CheckCircle, Clock, AlertTriangle } from "lucide-react"

export default function DailyBriefArchivePage() {
  const [briefs, setBriefs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await getDailyBriefArchive()
        setBriefs(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <>
      <TopAppBar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-16">
        <div className="mb-8">
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Daily Brief Archive
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Browse and access past daily operations briefs
          </p>
        </div>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-surface-container rounded-xl" />
            ))}
          </div>
        ) : briefs.length === 0 ? (
          <div className="text-center py-16 bg-surface-container-low rounded-2xl">
            <FileText className="w-12 h-12 mx-auto text-on-surface-variant opacity-30 mb-4" />
            <p className="text-on-surface-variant">No briefs in the archive yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {briefs.map((brief) => (
              <Link
                key={brief.id}
                href={`/daily-brief/${brief.slug}`}
                className="flex items-center justify-between p-5 bg-surface-container-low rounded-2xl hover:bg-surface-container transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center">
                    <FileText className="w-5 h-5 text-on-primary-container" />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface group-hover:text-primary transition-colors">
                      {brief.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(brief.brief_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                      {brief.prepared_by_name && (
                        <span>by {brief.prepared_by_name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    brief.status === "published" ? "bg-emerald-500/20 text-emerald-500" :
                    brief.status === "draft" ? "bg-amber-500/20 text-amber-500" :
                    "bg-surface-container-high text-on-surface-variant"
                  }`}>
                    {brief.status}
                  </span>
                  {brief.pdf_url && (
                    <span className="text-xs text-on-surface-variant bg-surface-container-high px-2 py-1 rounded-lg">
                      PDF
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
