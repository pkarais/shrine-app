import { Bell, CalendarDays, ClipboardCheck, Clock, Download, ExternalLink, FileText, Medal, ShieldAlert, Sparkles, Truck, Trophy, Wrench } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { fetchIssueBySlug } from "@/lib/actions/operations-brief"

const SECTION_ACCENT: Record<string, string> = {
  at_a_glance: "border-l-cyan-400",
  facilities_maintenance: "border-l-slate-400",
  security_safety: "border-l-amber-400",
  event_readiness: "border-l-violet-400",
  recognition_badges: "border-l-amber-300",
  leaderboard: "border-l-amber-400",
  sop_spotlight: "border-l-emerald-400",
  supplies_vendors_equipment: "border-l-sky-400",
  next_month_priorities: "border-l-blue-400",
  staff_reminders: "border-l-rose-400",
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

export default async function BriefPage({ params }: { params: { slug: string } }) {
  const result = await fetchIssueBySlug(params.slug)
  if (!result) notFound()

  const { issue, sections } = result
  const metrics = (issue as any).content?.metrics || {}
  const accentRow = [
    { icon: Clock, label: "Attendance" },
    { icon: Wrench, label: "Maintenance" },
    { icon: ShieldAlert, label: "Safety" },
    { icon: ClipboardCheck, label: "Walkthroughs" },
    { icon: Trophy, label: "Recognition" },
  ]

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link href="/operations-brief/archive" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
          &larr; Back to Archive
        </Link>

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
              <span>{new Date((issue as any).issue_month).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
              {(issue as any).prepared_by_name && (
                <>
                  <span className="text-outline">|</span>
                  <span>Prepared by {(issue as any).prepared_by_name}</span>
                </>
              )}
            </div>

            <div className="mt-6 border-t border-outline-variant/30 pt-6">
              <h2 className="text-lg font-bold">Opening Message from Operations</h2>
              <p className="mt-3 max-w-4xl text-base leading-7 text-on-surface-variant">{(issue as any).opening_message}</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {(issue as any).pdf_url && (
                <a href={(issue as any).pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-on-secondary">
                  <Download className="w-4 h-4" /> Download PDF
                </a>
              )}
              {(issue as any).website_url && (
                <a href={(issue as any).website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-surface-container px-4 py-2 text-sm font-bold text-on-surface border border-outline-variant/30">
                  <ExternalLink className="w-4 h-4" /> Open Website Post
                </a>
              )}
            </div>
          </header>

           {Object.keys(metrics).length > 0 && (
            <section className="grid gap-3 bg-surface-container-low p-6 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(metrics as Record<string, any>).slice(0, 6).map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                    {key.replaceAll("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </p>
                  <p className="mt-1 text-3xl font-black text-on-surface">{String(value)}</p>
                </div>
              ))}
            </section>
          )}

          <div className="space-y-5 p-6">
            {sections.map((section: any) => {
              const accentClass = SECTION_ACCENT[section.section_key] || "border-l-outline-variant"
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
                  {section.markdown_body ? (
                    <p className="mt-4 whitespace-pre-line text-sm leading-6 text-on-surface">{section.markdown_body}</p>
                  ) : null}
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
      </div>
    </main>
  )
}
