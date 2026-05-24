"use client"

import { useEffect, useState } from "react"
import { Archive, Download, ExternalLink, Loader2, Newspaper } from "lucide-react"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { fetchOperationsBriefArchive } from "@/lib/operations-brief-api"

export default function OperationsBriefArchivePage() {
  const [issues, setIssues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function loadArchive() {
      try {
        setLoading(true)
        const data = await fetchOperationsBriefArchive()
        if (mounted) setIssues(data)
      } catch (err: any) {
        if (mounted) setError(err.message ?? "Unable to load archive.")
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadArchive()
    return () => { mounted = false }
  }, [])

  return (
    <>
      <TopAppBar />
      <main className="min-h-screen bg-surface pt-24 pb-16 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 rounded-3xl bg-primary p-6 text-white shadow-xl md:p-8">
            <div className="flex items-center gap-3 text-white/70">
              <Archive className="w-6 h-6" />
              <span className="text-sm font-semibold uppercase tracking-[0.2em]">Operations Website Archive</span>
            </div>
            <h1 className="mt-4 text-3xl font-black md:text-5xl">Operations Monthly Brief Archive</h1>
            <p className="mt-3 max-w-3xl text-white/70">
              View published monthly briefs, download PDFs, and open website versions of archived operations updates.
            </p>
          </div>

          {loading && (
            <div className="flex items-center gap-3 rounded-2xl bg-white p-5 text-on-surface-variant shadow-sm">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading archive...
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {issues.map((issue) => (
              <article key={issue.id} className="rounded-3xl border border-outline-variant/30 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-primary p-3 text-white">
                    <Newspaper className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
                      {new Date(issue.issue_month).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                    </p>
                    <h2 className="mt-1 text-xl font-black text-on-surface">{issue.title}</h2>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-on-surface">{issue.opening_message}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {issue.website_url && (
                        <a href={issue.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-white">
                          <ExternalLink className="w-4 h-4" /> Open Post
                        </a>
                      )}
                      {issue.pdf_url && (
                        <a href={issue.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm font-bold text-on-secondary">
                          <Download className="w-4 h-4" /> Download PDF
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {!loading && issues.length === 0 && (
            <div className="rounded-2xl bg-white p-6 text-on-surface-variant shadow-sm">
              No Operations Briefs are published yet.
            </div>
          )}
        </div>
      </main>
    </>
  )
}
