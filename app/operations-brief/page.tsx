"use client"

import { useMemo, useState } from "react"
import { FilePlus2, Loader2, Newspaper, Send } from "lucide-react"
import { TopAppBar } from "@/components/layout/TopAppBar"
import OperationsBriefPreview from "@/components/operations-brief/OperationsBriefPreview"
import {
  generateOperationsBriefDraft,
  publishOperationsBrief,
  type OperationsBriefIssue,
  type OperationsBriefSection,
} from "@/lib/operations-brief-api"
import { createClient } from "@/utils/supabase/client"
import { useEffect } from "react"

export default function OperationsBriefGeneratorPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [issueMonth, setIssueMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [issue, setIssue] = useState<OperationsBriefIssue | null>(null)
  const [sections, setSections] = useState<OperationsBriefSection[]>([])
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [pdfUrl, setPdfUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then((result: any) => {
      const u = result?.data?.user ?? null
      setUser(u)
      if (u) {
        supabase.from("profiles").select("id, role, full_name").eq("id", u.id).single().then((pResult: any) => setProfile(pResult?.data ?? null))
      }
    })
  }, [])

  const monthDate = useMemo(() => `${issueMonth}-01`, [issueMonth])

  async function handleGenerateDraft() {
    try {
      setLoading(true)
      setError(null)
      setMessage(null)
      const result = await generateOperationsBriefDraft(monthDate, profile?.id ?? null)
      setIssue(result.issue)
      setSections(result.sections)
      setMessage("Draft generated from Operations App data.")
    } catch (err: any) {
      setError(err.message ?? "Unable to generate draft.")
    } finally {
      setLoading(false)
    }
  }

  async function handlePublish() {
    if (!issue?.id) return
    try {
      setLoading(true)
      setError(null)
      setMessage(null)
      await publishOperationsBrief(issue.id, websiteUrl || null, pdfUrl || null)
      setIssue({ ...issue, status: "published" })
      setMessage("Operations Brief published and available in the archive.")
    } catch (err: any) {
      setError(err.message ?? "Unable to publish brief.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <TopAppBar />
      <main className="min-h-screen bg-surface pt-24 pb-16 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 rounded-3xl bg-primary p-6 text-white shadow-xl md:p-8">
            <div className="flex items-center gap-3 text-white/70">
              <Newspaper className="w-6 h-6" />
              <span className="text-sm font-semibold uppercase tracking-[0.2em]">Operations Website Publishing</span>
            </div>
            <h1 className="mt-4 text-3xl font-black md:text-5xl">Operations Monthly Brief Generator</h1>
            <p className="mt-3 max-w-3xl text-white/70">
              Generate a monthly newsletter draft from live app data, preview it, publish it, and archive it for staff access and PDF download.
            </p>
          </div>

          <div className="mb-6 grid gap-4 rounded-3xl border border-outline-variant/30 bg-white p-5 shadow-sm lg:grid-cols-[220px_1fr_1fr_auto_auto]">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Issue Month</span>
              <input
                type="month"
                value={issueMonth}
                onChange={(e) => setIssueMonth(e.target.value)}
                className="mt-2 w-full rounded-xl border border-outline-variant/30 px-3 py-2 text-on-surface bg-surface-container-low"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Website URL</span>
              <input
                type="url"
                placeholder="https://..."
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="mt-2 w-full rounded-xl border border-outline-variant/30 px-3 py-2 text-on-surface bg-surface-container-low"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">PDF URL</span>
              <input
                type="url"
                placeholder="https://.../brief.pdf"
                value={pdfUrl}
                onChange={(e) => setPdfUrl(e.target.value)}
                className="mt-2 w-full rounded-xl border border-outline-variant/30 px-3 py-2 text-on-surface bg-surface-container-low"
              />
            </label>

            <button
              onClick={handleGenerateDraft}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-white disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}
              Generate Draft
            </button>

            <button
              onClick={handlePublish}
              disabled={loading || !issue}
              className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 font-bold text-on-secondary disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Publish
            </button>
          </div>

          {message && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">{message}</div>
          )}
          {error && (
            <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>
          )}

          <OperationsBriefPreview issue={issue} sections={sections} />
        </div>
      </main>
    </>
  )
}
