import { redirect } from "next/navigation"
import { Bell, CalendarDays, ClipboardCheck, Clock, Download, ExternalLink, FileText, Medal, ShieldAlert, Sparkles, Truck, Trophy, Wrench } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { createServerClient } from "@/utils/supabase/server"
import { fetchDailyBriefBySlug } from "@/lib/actions/daily-brief"

const SECTION_ACCENT: Record<string, string> = {
  at_a_glance: "border-l-cyan-400",
  scheduling_shifts: "border-l-blue-400",
  site_readiness: "border-l-emerald-400",
  incidents_safety: "border-l-amber-400",
  maintenance_tickets: "border-l-slate-400",
  team_building: "border-l-violet-400",
  upcoming_events: "border-l-sky-400",
  manager_notes: "border-l-rose-400",
}

function SectionIcon({ sectionKey }: { sectionKey: string }) {
  if (sectionKey.includes("shift")) return <Clock className="w-5 h-5" />
  if (sectionKey.includes("readiness")) return <ClipboardCheck className="w-5 h-5" />
  if (sectionKey.includes("safety")) return <ShieldAlert className="w-5 h-5" />
  if (sectionKey.includes("ticket")) return <Wrench className="w-5 h-5" />
  if (sectionKey.includes("team")) return <Medal className="w-5 h-5" />
  if (sectionKey.includes("event")) return <CalendarDays className="w-5 h-5" />
  if (sectionKey.includes("notes")) return <Sparkles className="w-5 h-5" />
  return <FileText className="w-5 h-5" />
}

export default async function DailyBriefPublicPage({ params }: { params: { slug: string } }) {
  // Auth guard — daily briefs contain operational data; require authentication
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const result = await fetchDailyBriefBySlug(params.slug)
  if (!result) notFound()

  const { issue, sections } = result
  const metrics = (issue as any).content?.metrics || {}

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link href="/daily-brief/archive" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
          &larr; Back to Archive
        </Link>

        <article className="overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest shadow-xl">
          <header className="relative bg-surface p-8 text-on-surface">
            <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Daily Brief
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {new Date((issue as any).brief_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">{(issue as any).title}</h1>
            <p className="mt-2 text-sm text-on-surface-variant">{(issue as any).opening_message}</p>

            {/* Metrics */}
            {Object.keys(metrics).length > 0 && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(metrics as Record<string, any>).map(([key, value]) => (
                  <div key={key} className="rounded-xl bg-surface-container p-3 text-center">
                    <p className="text-xl font-black text-on-surface">{String(value)}</p>
                    <p className="text-[10px] font-bold uppercase text-on-surface-variant">{key.replace(/_/g, " ")}</p>
                  </div>
                ))}
              </div>
            )}
          </header>

          <div className="space-y-5 p-6">
            {(sections || []).map((section: any) => {
              const accentClass = SECTION_ACCENT[section.section_key] || "border-l-outline-variant"
              return (
                <section key={section.id} className={`rounded-2xl border border-outline-variant/30 border-l-4 p-5 ${accentClass}`}>
                  <div className="flex items-center gap-3 mb-3">
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
                    <div className="mt-4 whitespace-pre-line text-sm leading-6 text-on-surface">
                      {section.markdown_body.split("\n").map((line: string, idx: number) => {
                        if (line.startsWith("- **")) {
                          return <p key={idx} className="mb-1">{line.replace(/^- /, "• ")}</p>
                        }
                        return <p key={idx} className="mb-1">{line}</p>
                      })}
                    </div>
                  ) : null}
                </section>
              )
            })}
          </div>

          <footer className="border-t border-outline-variant/30 bg-surface-container-low p-6 text-center text-xs text-on-surface-variant">
            <p className="font-bold">Operations Daily Brief</p>
            <p className="mt-1">Generated from Operations App daily activity.</p>
            <p className="mt-1">Source of Truth: Operations App + Supabase Records</p>
          </footer>
        </article>
      </div>
    </main>
  )
}
