"use client"

import { useState } from "react"
import { Bell, CalendarDays, ClipboardCheck, Clock, Download, ExternalLink, FileText, Pencil, Save, ShieldAlert, Sparkles, Truck, Trophy, Wrench, X } from "lucide-react"
import type { OperationsBriefIssue, OperationsBriefSection } from "@/lib/operations-brief-api"
import { easternMonthLabel } from "@/lib/eastern-time"

type Props = {
  issue: OperationsBriefIssue | null
  sections: OperationsBriefSection[]
  editingMessage?: boolean
  editOpening?: string
  onEditOpeningChange?: (val: string) => void
  onSaveOpening?: () => void
  editingSopSpotlight?: boolean
  sopSpotlightTitle?: string
  sopSpotlightBody?: string
  onSopSpotlightTitleChange?: (val: string) => void
  onSopSpotlightBodyChange?: (val: string) => void
  onSaveSopSpotlight?: () => void
  /** Manager-only callback to persist any section's edited markdown_body. */
  onSaveSectionMarkdown?: (sectionId: string, markdown: string) => Promise<void> | void
  /** When true, every section shows a Pencil button to inline-edit the text. */
  canEditSections?: boolean
}

const SECTION_ACCENT: Record<string, string> = {
  at_a_glance: "border-l-primary bg-primary-container/30",
  facilities_maintenance: "border-l-outline bg-surface-container/50",
  security_safety: "border-l-secondary bg-secondary-container/30",
  event_readiness: "border-l-tertiary bg-tertiary-container/30",
  recognition_badges: "border-l-secondary bg-secondary-container/30",
  leaderboard: "border-l-secondary bg-secondary-container/30",
  sop_spotlight: "border-l-primary bg-primary-container/30",
  supplies_vendors_equipment: "border-l-primary bg-primary-container/30",
  next_month_priorities: "border-l-primary bg-primary-container/30",
  staff_reminders: "border-l-error bg-error-container/30",
}

function metricLabel(key: string) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

function SectionIcon({ sectionKey }: { sectionKey: string }) {
  if (sectionKey.includes("facilities")) return <Wrench className="w-5 h-5" />
  if (sectionKey.includes("security")) return <ShieldAlert className="w-5 h-5" />
  if (sectionKey.includes("recognition")) return <Sparkles className="w-5 h-5" />
  if (sectionKey.includes("leaderboard")) return <Trophy className="w-5 h-5" />
  if (sectionKey.includes("sop")) return <ClipboardCheck className="w-5 h-5" />
  if (sectionKey.includes("supplies") || sectionKey.includes("vendor")) return <Truck className="w-5 h-5" />
  if (sectionKey.includes("reminder")) return <Bell className="w-5 h-5" />
  if (sectionKey.includes("event")) return <CalendarDays className="w-5 h-5" />
  return <FileText className="w-5 h-5" />
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-surface-container-low text-on-surface-variant",
    review: "bg-tertiary-container text-on-tertiary-container",
    published: "bg-secondary-container text-on-secondary-container",
    archived: "bg-surface-variant text-on-surface",
  }
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${colors[status] || colors.draft}`}>
      {status}
    </span>
  )
}

export default function OperationsBriefPreview({
  issue, sections, editingMessage, editOpening, onEditOpeningChange, onSaveOpening,
  editingSopSpotlight, sopSpotlightTitle, sopSpotlightBody,
  onSopSpotlightTitleChange, onSopSpotlightBodyChange, onSaveSopSpotlight,
  onSaveSectionMarkdown, canEditSections,
}: Props) {
  // Local per-section edit state — keyed by section.id so each card
  // tracks its own draft text + saving state without lifting all of
  // it into the parent page.
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [sectionDraft, setSectionDraft] = useState<string>("")
  const [savingSectionId, setSavingSectionId] = useState<string | null>(null)

  if (!issue) {
    return (
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 text-on-surface-variant shadow-sm">
        Generate or select an Operations Brief to preview it here.
      </div>
    )
  }

  const metrics = issue.content?.metrics ?? {}
  const accentRow = [
    { icon: Clock, label: "Attendance" },
    { icon: Wrench, label: "Maintenance" },
    { icon: ShieldAlert, label: "Safety" },
    { icon: ClipboardCheck, label: "Walkthroughs" },
    { icon: Trophy, label: "Recognition" },
  ]

  return (
    <article className="overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest shadow-xl">
      <header className="relative bg-surface p-8 text-on-surface">
        <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
          {accentRow.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.25em] text-on-surface-variant">Operations Monthly Brief</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight md:text-5xl">Operations Monthly Brief</h1>
        <p className="mt-1 text-sm text-on-surface-variant">Facilities &bull; Safety &bull; Service Readiness &bull; Recognition</p>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
          <CalendarDays className="w-4 h-4" />
          <span>{easternMonthLabel(String(issue.issue_month || ""))}</span>
          <span className="text-outline">|</span>
          <StatusBadge status={issue.status} />
        </div>

        <div className="mt-6 border-t border-outline-variant/30 pt-6">
          <h2 className="text-lg font-bold">Opening Message from Operations</h2>
          {editingMessage ? (
            <div className="mt-3">
              <textarea
                value={editOpening || ""}
                onChange={(e) => onEditOpeningChange?.(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-outline-variant/30 bg-surface-container p-3 text-base leading-7 text-on-surface placeholder-on-surface-variant"
              />
              <button
                onClick={onSaveOpening}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-on-secondary"
              >
                <Save className="w-4 h-4" /> Save Opening Message
              </button>
            </div>
          ) : (
            <p className="mt-3 max-w-4xl text-base leading-7 text-on-surface-variant">{issue.opening_message}</p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {issue.pdf_url ? (
            <a href={issue.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-on-secondary">
              <Download className="w-4 h-4" /> Download PDF
            </a>
          ) : null}
          {issue.website_url ? (
            <a href={issue.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2 text-sm font-bold text-on-surface border border-outline-variant/30">
              <ExternalLink className="w-4 h-4" /> Open Website Post
            </a>
          ) : null}
          {issue.slug && (
            <a href={`/brief/${issue.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2 text-sm font-bold text-on-surface border border-outline-variant/30">
              <ExternalLink className="w-4 h-4" /> Preview Website Post
            </a>
          )}
        </div>
      </header>

      <section className="grid gap-3 bg-surface-container-low p-6 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(metrics).slice(0, 6).map(([key, value]) => (
          <div key={key} className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{metricLabel(key)}</p>
            <p className="mt-1 text-3xl font-black text-on-surface">{String(value)}</p>
          </div>
        ))}
      </section>

      <div className="space-y-5 p-6">
        {sections.map((section) => {
          const accentClass = SECTION_ACCENT[section.section_key] || "border-l-outline-variant"
          const isSopSpotlight = section.section_key === "sop_spotlight"
          return (
            <section key={section.id} className={`rounded-2xl border border-outline-variant/30 border-l-4 p-5 ${accentClass}`}>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-primary p-2 text-on-primary">
                  <SectionIcon sectionKey={section.section_key} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    {section.section_key.replaceAll("_", " ")}
                  </p>
                  <h2 className="text-xl font-bold text-on-surface">{section.section_title}</h2>
                </div>
              </div>

              {isSopSpotlight && editingSopSpotlight ? (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">SOP Title</label>
                    <input
                      type="text"
                      value={sopSpotlightTitle ?? ""}
                      onChange={(e) => onSopSpotlightTitleChange?.(e.target.value)}
                      placeholder="e.g. Opening and Closing Walkthrough Standards"
                      className="w-full rounded-xl border border-outline-variant/30 bg-surface-container px-3 py-2 text-sm text-on-surface placeholder-on-surface-variant"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-on-surface-variant mb-1">Spotlight Message</label>
                    <textarea
                      value={sopSpotlightBody ?? ""}
                      onChange={(e) => onSopSpotlightBodyChange?.(e.target.value)}
                      rows={4}
                      placeholder="Describe what this SOP covers and why it matters this month..."
                      className="w-full rounded-xl border border-outline-variant/30 bg-surface-container p-3 text-sm leading-6 text-on-surface placeholder-on-surface-variant"
                    />
                  </div>
                  <button
                    onClick={onSaveSopSpotlight}
                    className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-on-secondary"
                  >
                    <Save className="w-4 h-4" /> Save SOP Spotlight
                  </button>
                </div>
              ) : (
                <>
                  {editingSectionId === section.id ? (
                    <div className="mt-4 space-y-2">
                      <textarea
                        value={sectionDraft}
                        onChange={(e) => setSectionDraft(e.target.value)}
                        rows={Math.max(4, sectionDraft.split("\n").length + 1)}
                        className="w-full rounded-xl border border-outline-variant/30 bg-surface-container p-3 text-sm leading-6 text-on-surface placeholder-on-surface-variant"
                        placeholder="Edit this section's text…"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={savingSectionId === section.id}
                          onClick={async () => {
                            if (!onSaveSectionMarkdown) return
                            try {
                              setSavingSectionId(section.id)
                              await onSaveSectionMarkdown(section.id, sectionDraft)
                              setEditingSectionId(null)
                            } finally {
                              setSavingSectionId(null)
                            }
                          }}
                          className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-on-secondary disabled:opacity-60"
                        >
                          <Save className="w-4 h-4" /> {savingSectionId === section.id ? "Saving…" : "Save Section Text"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSectionId(null)}
                          className="inline-flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2 text-sm font-bold text-on-surface border border-outline-variant/30"
                        >
                          <X className="w-4 h-4" /> Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {section.markdown_body ? (
                        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-on-surface">{section.markdown_body}</p>
                      ) : null}
                      {canEditSections && onSaveSectionMarkdown ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSectionDraft(section.markdown_body || "")
                            setEditingSectionId(section.id)
                          }}
                          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-surface-container px-3 py-1.5 text-xs font-bold text-on-surface border border-outline-variant/30"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit Section Text
                        </button>
                      ) : null}
                    </>
                  )}
                  {section.content && Object.keys(section.content).length > 0 ? (
                    <details className="mt-4 group">
                      <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-on-surface">
                        Show raw data
                      </summary>
                      <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-surface p-4 text-xs text-on-surface">
                        {JSON.stringify(section.content, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </>
              )}
            </section>
          )
        })}
      </div>

      <footer className="border-t border-outline-variant/30 bg-surface-container-low p-6 text-center text-xs text-on-surface-variant">
        <p className="font-bold">Operations Monthly Brief</p>
        <p className="mt-1">Generated from Operations App activity and monthly management review.</p>
        <p className="mt-1">Source of Truth: Operations App + Supabase Records</p>
        <p className="mt-1">
          Archive: <a href="/operations-brief/archive" className="underline text-primary">Operations Website Archive</a>
        </p>
      </footer>
    </article>
  )
}
