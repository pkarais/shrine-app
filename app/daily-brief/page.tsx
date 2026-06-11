"use client"

import { useState, useEffect, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { generateDailyBriefDraft, updateDailyBriefStatus, updateDailyBriefField, updateDailySectionContent, fetchDailyBriefBySlug } from "@/lib/actions/daily-brief"
import { FileText, RefreshCw, Send, Save, Archive, Eye, Download, Clock, Users, ClipboardCheck, ShieldAlert, Wrench, CalendarDays, Award, Edit3, Loader2, Mail } from "lucide-react"

const SECTION_ICONS: Record<string, any> = {
  at_a_glance: Clock,
  scheduling_shifts: Users,
  site_readiness: ClipboardCheck,
  incidents_safety: ShieldAlert,
  maintenance_tickets: Wrench,
  team_building: Award,
  upcoming_events: CalendarDays,
  manager_notes: Edit3,
}

export default function DailyBriefPage() {
  const router = useRouter()
  const [briefDate, setBriefDate] = useState(new Date().toISOString().slice(0, 10))
  const [issue, setIssue] = useState<any>(null)
  const [sections, setSections] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [emailPanel, setEmailPanel] = useState(false)
  const [emailRecipients, setEmailRecipients] = useState("")
  const [emailSending, setEmailSending] = useState(false)
  const [emailMessage, setEmailMessage] = useState<string | null>(null)

  const loadBrief = useCallback(async () => {
    setLoading(true)
    try {
      const slug = `daily-brief-${briefDate}`
      const result = await fetchDailyBriefBySlug(slug)
      if (result) {
        setIssue(result.issue)
        setSections(result.sections || [])
      } else {
        setIssue(null)
        setSections([])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [briefDate])

  async function handleGenerate() {
    setGenerating(true)
    try {
      const result = await generateDailyBriefDraft(briefDate)
      if (result.success) {
        await loadBrief()
      }
    } catch (e: any) {
      alert(e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handlePublish() {
    if (!issue) return
    setPublishing(true)
    try {
      await updateDailyBriefStatus(issue.id, "published")
      router.push("/daily-brief/archive")
    } catch (e: any) {
      alert(e.message)
      setPublishing(false)
    }
  }

  async function handleDownloadPdf() {
    if (!issue) return
    setDownloading(true)
    try {
      const res = await fetch("/api/generate-daily-brief-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId: issue.id }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "PDF generation failed")
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${issue.slug || "daily-brief"}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setDownloading(false)
    }
  }

  async function handleArchive() {
    if (!issue) return
    try {
      await updateDailyBriefStatus(issue.id, "archived")
      router.push("/daily-brief/archive")
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function handleSendEmail() {
    if (!issue) return
    try {
      setEmailSending(true)
      setEmailMessage(null)
      const { sendDailyBriefEmail } = await import("@/lib/actions/daily-brief")
      await sendDailyBriefEmail(issue.id, emailRecipients)
      setEmailMessage("Email sent successfully.")
      setEmailPanel(false)
      setEmailRecipients("")
    } catch (e: any) {
      setEmailMessage(`Error: ${e.message}`)
    } finally {
      setEmailSending(false)
    }
  }

  async function handleUpdateField(field: string, value: string) {
    if (!issue) return
    await updateDailyBriefField(issue.id, field, value)
  }

  async function handleUpdateSection(sectionId: string, markdown: string) {
    setSaving(sectionId)
    try {
      await updateDailySectionContent(sectionId, markdown)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(null)
    }
  }

  useEffect(() => {
    loadBrief()
  }, [loadBrief])

  const metrics = issue?.content?.metrics || {}

  return (
    <>
      <TopAppBar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <Image
              src="/images/logo-color.jpg"
              alt="Saint Nicholas Shrine"
              width={144}
              height={58}
              className="w-36 h-auto object-contain mb-3 dark:hidden"
            />
            <Image
              src="/images/logo-white.png"
              alt="Saint Nicholas Shrine"
              width={144}
              height={58}
              className="w-36 h-auto object-contain mb-3 hidden dark:block"
            />
            <h1 className="font-headline text-2xl sm:text-3xl font-bold text-on-surface flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              Daily Operations Brief
            </h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Generate and manage daily manager briefs
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={briefDate}
              onChange={(e) => setBriefDate(e.target.value)}
              className="px-4 py-2 bg-surface-container-high rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              {generating ? "Generating..." : issue ? "Regenerate" : "Generate"}
            </button>
          </div>
        </div>

        {!issue && !loading && (
          <div className="text-center py-20 bg-surface-container-low rounded-2xl">
            <FileText className="w-12 h-12 mx-auto text-on-surface-variant opacity-30 mb-4" />
            <p className="text-on-surface-variant mb-4">No brief found for this date.</p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Daily Brief"}
            </button>
          </div>
        )}

        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-32 bg-surface-container rounded-2xl" />
            <div className="h-64 bg-surface-container rounded-2xl" />
          </div>
        )}

        {issue && (
          <div className="space-y-6">
            {/* Status Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-low rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  issue.status === "published" ? "bg-secondary-container text-on-secondary-container" :
                  issue.status === "draft" ? "bg-surface-container-high text-on-surface-variant" :
                  "bg-surface-container-high text-on-surface-variant"
                }`}>
                  {issue.status}
                </span>
                <span className="text-sm text-on-surface-variant">
                  {new Date(issue.brief_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {issue.status === "draft" && (
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {publishing ? "Publishing..." : "Publish & Archive"}
                  </button>
                )}
                {issue.status === "draft" && (
                  <button
                    onClick={handleArchive}
                    className="px-4 py-2 bg-surface-container-highest text-on-surface rounded-xl font-bold text-sm hover:bg-surface-dim transition-colors flex items-center gap-2"
                  >
                    <Archive className="w-4 h-4" /> Archive Draft
                  </button>
                )}
                <a
                  href={`/daily-brief/${issue.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm hover:bg-surface-dim transition-colors flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" /> Preview
                </a>
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="px-4 py-2 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm hover:bg-surface-dim transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  {downloading ? "Generating..." : "Download PDF"}
                </button>
                <button
                  onClick={() => setEmailPanel((p) => !p)}
                  className="px-4 py-2 bg-surface-container-high text-on-surface rounded-xl font-bold text-sm hover:bg-surface-dim transition-colors flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Send Email
                </button>
              </div>
            </div>

            {emailPanel && (
              <div className="bg-surface-container-low rounded-2xl p-5">
                <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Send as HTML Email</p>
                <p className="text-xs text-on-surface-variant mb-3">Separate multiple addresses with commas or spaces.</p>
                {emailMessage && (
                  <p className={`text-sm mb-3 font-medium ${emailMessage.startsWith("Error") ? "text-error" : "text-secondary"}`}>{emailMessage}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  <input
                    type="text"
                    value={emailRecipients}
                    onChange={(e) => setEmailRecipients(e.target.value)}
                    placeholder="john@example.com, jane@example.com"
                    className="flex-1 min-w-[240px] px-4 py-2 bg-surface-container-high rounded-xl text-sm text-on-surface outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    onClick={handleSendEmail}
                    disabled={emailSending || !emailRecipients.trim()}
                    className="px-5 py-2 bg-primary text-on-primary rounded-xl font-bold text-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                    {emailSending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            )}

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Object.entries(metrics).map(([key, value]: [string, any]) => (
                <div key={key} className="bg-surface-container-low rounded-xl p-4 text-center">
                  <p className="text-2xl font-black text-on-surface">{value}</p>
                  <p className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider mt-1">
                    {key.replace(/_/g, " ")}
                  </p>
                </div>
              ))}
            </div>

            {/* Opening Message */}
            <div className="bg-surface-container-low rounded-2xl p-6">
              <label className="text-xs font-bold uppercase text-on-surface-variant tracking-wider mb-2 block">
                Opening Message
              </label>
              <textarea
                defaultValue={issue.opening_message || ""}
                onBlur={(e) => handleUpdateField("opening_message", e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-high rounded-xl text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                rows={3}
              />
            </div>

            {/* Sections */}
            <div className="space-y-4">
              {sections.map((section) => {
                const Icon = SECTION_ICONS[section.section_key] || FileText
                return (
                  <div key={section.id} className="bg-surface-container-low rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 p-4 border-b border-[var(--outline-variant)]/20">
                      <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
                        <Icon className="w-4 h-4 text-on-primary-container" />
                      </div>
                      <h3 className="font-bold text-on-surface">{section.section_title}</h3>
                    </div>
                    <div className="p-4">
                      <textarea
                        defaultValue={section.markdown_body || ""}
                        onBlur={(e) => handleUpdateSection(section.id, e.target.value)}
                        className="w-full px-4 py-3 bg-surface-container-high rounded-xl text-on-surface text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none font-mono leading-relaxed"
                        rows={6}
                      />
                      {saving === section.id && (
                        <p className="text-xs text-on-surface-variant mt-2 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              {issue.status !== "published" && (
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {publishing ? "Publishing..." : "Publish Brief"}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  )
}
