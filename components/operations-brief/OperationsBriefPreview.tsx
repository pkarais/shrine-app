"use client"

import { CalendarDays, Download, ExternalLink, FileText, ShieldAlert, Sparkles, Trophy, Wrench } from "lucide-react"
import type { OperationsBriefIssue, OperationsBriefSection } from "@/lib/operations-brief-api"

type Props = {
  issue: OperationsBriefIssue | null
  sections: OperationsBriefSection[]
}

function metricLabel(key: string) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())
}

function SectionIcon({ sectionKey }: { sectionKey: string }) {
  if (sectionKey.includes("facilities")) return <Wrench className="w-5 h-5" />
  if (sectionKey.includes("security")) return <ShieldAlert className="w-5 h-5" />
  if (sectionKey.includes("recognition")) return <Sparkles className="w-5 h-5" />
  if (sectionKey.includes("leaderboard")) return <Trophy className="w-5 h-5" />
  return <FileText className="w-5 h-5" />
}

export default function OperationsBriefPreview({ issue, sections }: Props) {
  if (!issue) {
    return (
      <div className="rounded-2xl border border-outline-variant/30 bg-white p-6 text-on-surface-variant shadow-sm">
        Generate or select an Operations Brief to preview it here.
      </div>
    )
  }

  const metrics = issue.content?.metrics ?? {}

  return (
    <article className="overflow-hidden rounded-3xl border border-outline-variant/30 bg-white shadow-xl">
      <header className="bg-primary p-8 text-white">
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/70">
          <CalendarDays className="w-4 h-4" />
          <span>{new Date(issue.issue_month).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide">{issue.status}</span>
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">{issue.title}</h1>
        <p className="mt-4 max-w-4xl text-base leading-7 text-white/70">{issue.opening_message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {issue.pdf_url ? (
            <a href={issue.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-on-secondary">
              <Download className="w-4 h-4" /> Download PDF
            </a>
          ) : null}
          {issue.website_url ? (
            <a href={issue.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white">
              <ExternalLink className="w-4 h-4" /> Open Website Post
            </a>
          ) : null}
        </div>
      </header>

      <section className="grid gap-3 bg-surface-container-low p-6 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(metrics).map(([key, value]) => (
          <div key={key} className="rounded-2xl border border-outline-variant/30 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">{metricLabel(key)}</p>
            <p className="mt-2 text-3xl font-black text-on-surface">{String(value)}</p>
          </div>
        ))}
      </section>

      <div className="space-y-5 p-6">
        {sections.map((section) => (
          <section key={section.id} className="rounded-2xl border border-outline-variant/30 p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary p-2 text-white">
                <SectionIcon sectionKey={section.section_key} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {section.section_key.replaceAll("_", " ")}
                </p>
                <h2 className="text-xl font-bold text-on-surface">{section.section_title}</h2>
              </div>
            </div>
            {section.markdown_body ? (
              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-on-surface">{section.markdown_body}</p>
            ) : null}
            {section.content && Object.keys(section.content).length > 0 ? (
              <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-surface p-4 text-xs text-on-surface">
                {JSON.stringify(section.content, null, 2)}
              </pre>
            ) : null}
          </section>
        ))}
      </div>
    </article>
  )
}
