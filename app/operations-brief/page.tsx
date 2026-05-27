"use client"

export const dynamic = 'force-dynamic'

import { useMemo, useState } from "react"
import { ArrowLeftCircle, ArrowRightCircle, CheckCircle2, ExternalLink, FileDown, FilePlus2, Loader2, Newspaper, Pencil, XCircle } from "lucide-react"
import { TopAppBar } from "@/components/layout/TopAppBar"
import OperationsBriefPreview from "@/components/operations-brief/OperationsBriefPreview"
import {
  generateOperationsBriefDraft,
  type OperationsBriefIssue,
  type OperationsBriefSection,
} from "@/lib/operations-brief-api"
import { createClient } from "@/utils/supabase/client"
import { useEffect } from "react"

const STATUS_ORDER: Record<string, number> = { draft: 0, review: 1, approved: 2, published: 3, archived: 4 }

const STATUS_ACTIONS: Record<string, { label: string; next: string; icon: any; variant: string }[]> = {
  draft: [{ label: "Send to Review", next: "review", icon: ArrowRightCircle, variant: "bg-primary text-on-primary" }],
  review: [
    { label: "Publish", next: "published", icon: CheckCircle2, variant: "bg-secondary text-on-secondary" },
    { label: "Revise", next: "draft", icon: ArrowLeftCircle, variant: "bg-tertiary-container text-on-tertiary-container" },
  ],
  published: [
    { label: "Archive", next: "archived", icon: XCircle, variant: "bg-surface-variant text-on-surface" },
  ],
  archived: [
    { label: "Revise", next: "draft", icon: Pencil, variant: "bg-primary text-on-primary" },
  ],
}

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
  const [editingMessage, setEditingMessage] = useState(false)
  const [editOpening, setEditOpening] = useState("")

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
      setEditOpening(result.issue.opening_message || "")
      setWebsiteUrl(result.issue.website_url || "")
      setPdfUrl(result.issue.pdf_url || "")
      setMessage("Draft generated from Operations App data.")
    } catch (err: any) {
      setError(err.message ?? "Unable to generate draft.")
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusTransition(nextStatus: string) {
    if (!issue?.id) return
    try {
      setLoading(true)
      setError(null)
      setMessage(null)
      const { updateIssueStatus } = await import("@/lib/actions/operations-brief")
      await updateIssueStatus(issue.id, nextStatus)
      setIssue({ ...issue, status: nextStatus, published_at: nextStatus === "published" ? new Date().toISOString() : issue.published_at })
      setMessage(`Status changed to "${nextStatus}".`)
    } catch (err: any) {
      setError(err.message ?? "Unable to update status.")
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveOpening() {
    if (!issue?.id) return
    try {
      setLoading(true)
      const { updateIssueField } = await import("@/lib/actions/operations-brief")
      await updateIssueField(issue.id, "opening_message", editOpening)
      setIssue({ ...issue, opening_message: editOpening })
      setEditingMessage(false)
      setMessage("Opening message updated.")
    } catch (err: any) {
      setError(err.message ?? "Unable to save opening message.")
    } finally {
      setLoading(false)
    }
  }

  async function handleGeneratePdf() {
    if (!issue?.id) return
    try {
      setLoading(true)
      setError(null)
      setMessage("PDF generation started...")
      const res = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId: issue.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "PDF generation failed")
      if (data.pdfUrl) {
        setPdfUrl(data.pdfUrl)
        setIssue({ ...issue, pdf_url: data.pdfUrl })
      }
      setMessage("PDF generated.")
    } catch (err: any) {
      setError(err.message ?? "PDF generation unavailable.")
    } finally {
      setLoading(false)
    }
  }

  const actions = issue ? STATUS_ACTIONS[issue.status] || [] : []

  return (
    <>
      <TopAppBar />
      <main className="min-h-screen bg-surface pt-24 pb-16 px-6">
        <div className="mx-auto max-w-7xl">
          <div 
            className="mb-6 rounded-3xl overflow-hidden shadow-xl relative min-h-[280px] md:min-h-[320px] flex items-end"
            style={{ backgroundImage: 'url(/images/briefbackgrnd.png)', backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-primary/20" />
            <div className="relative z-10 p-6 md:p-8 w-full">
              <div className="flex items-center gap-3 text-white/80">
                <Newspaper className="w-6 h-6" />
                <span className="text-sm font-semibold uppercase tracking-[0.2em]">Operations Website Publishing</span>
              </div>
              <div className="mt-4 w-fit rounded-2xl bg-black/30 backdrop-blur-md px-5 py-3 border border-white/10">
                <h1 className="text-3xl font-black md:text-5xl text-white">Operations Monthly Brief Generator</h1>
              </div>
              <div className="mt-3 w-fit rounded-2xl bg-black/30 backdrop-blur-md px-5 py-3 border border-white/10">
                <p className="max-w-3xl text-white/80 text-sm md:text-base">
                  Generate a monthly newsletter draft from live app data, edit content, preview the website post, generate a PDF, and publish to the archive.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-end gap-4 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 shadow-sm">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Issue Month</span>
              <input
                type="month"
                value={issueMonth}
                onChange={(e) => setIssueMonth(e.target.value)}
                className="mt-2 w-full rounded-xl border border-outline-variant/30 px-3 py-2 text-on-surface bg-surface-container-low"
              />
            </label>

            <button
              onClick={handleGenerateDraft}
              disabled={loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-white disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}
              Generate Draft
            </button>

            {issue?.slug && (
              <a
                href={`/brief/${issue.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/30 px-4 py-3 font-bold text-on-surface"
              >
                <ExternalLink className="w-4 h-4" />
                Website Preview
              </a>
            )}

            <button
              onClick={handleGeneratePdf}
              disabled={loading || !issue}
              className="flex items-center justify-center gap-2 rounded-xl border border-outline-variant/30 px-4 py-3 font-bold text-on-surface disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              Generate PDF
            </button>
          </div>

          {issue && (
            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wide text-on-surface-variant">Status:</span>
              <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                issue.status === "published" ? "bg-secondary-container text-on-secondary-container" :
                issue.status === "review" ? "bg-tertiary-container text-on-tertiary-container" :
                issue.status === "archived" ? "bg-surface-variant text-on-surface" :
                "bg-surface-container-low text-on-surface-variant"
              }`}>{issue.status}</span>
              <span className="mx-2 text-on-surface-variant">|</span>
              {actions.map((action) => (
                <button
                  key={action.next}
                  onClick={() => handleStatusTransition(action.next)}
                  disabled={loading}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50 ${action.variant}`}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <action.icon className="w-4 h-4" />}
                  {action.label}
                </button>
              ))}
              {issue.status === "draft" && (
                <button
                  onClick={() => { setEditingMessage(!editingMessage); if (!editingMessage) setEditOpening(issue.opening_message || "") }}
                  className="flex items-center gap-2 rounded-xl border border-outline-variant/30 px-4 py-2 text-sm font-bold text-on-surface"
                >
                  <Pencil className="w-4 h-4" />
                  {editingMessage ? "Done Editing" : "Edit Message"}
                </button>
              )}
              {issue.status === "published" && (
                <div className="flex items-center gap-3 ml-auto text-xs text-on-surface-variant">
                  {issue.website_url && <a href={issue.website_url} target="_blank" rel="noreferrer" className="underline">Website Post</a>}
                  {issue.pdf_url && <a href={issue.pdf_url} target="_blank" rel="noreferrer" className="underline">Download PDF</a>}
                </div>
              )}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-2xl border border-secondary bg-secondary-container p-4 text-on-secondary-container">{message}</div>
          )}
          {error && (
            <div className="mb-4 rounded-2xl border border-error bg-error-container p-4 text-on-error">{error}</div>
          )}

          <OperationsBriefPreview
            issue={issue}
            sections={sections}
            editingMessage={editingMessage}
            editOpening={editOpening}
            onEditOpeningChange={setEditOpening}
            onSaveOpening={handleSaveOpening}
          />
        </div>
      </main>
    </>
  )
}
