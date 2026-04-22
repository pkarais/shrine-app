import { createServerClient } from "@/utils/supabase/server"
import { getStaffingGaps } from "@/lib/actions/staffing"
import Link from "next/link"
import { notFound } from "next/navigation"

interface Props {
  params: { date: string }
}

function getEventEndTime(startTimeIso: string, endTimeIso?: string | null) {
  if (endTimeIso) return new Date(endTimeIso)
  return new Date(new Date(startTimeIso).getTime() + 60 * 60 * 1000)
}

export default async function CalendarDatePage({ params }: Props) {
  const supabase = createServerClient()
  const { date } = params

  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    notFound()
  }

  const startOfDay = new Date(date + "T00:00:00").toISOString()
  const endOfDay = new Date(date + "T23:59:59").toISOString()

  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .gte("start_time", startOfDay)
    .lte("start_time", endOfDay)
    .order("start_time", { ascending: true })

  const { data: shifts } = await supabase
    .from("shifts")
    .select("*, profiles(full_name, email, role)")
    .gte("clock_in", startOfDay)
    .lte("clock_in", endOfDay)

  const formattedDate = dateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div className="max-w-4xl mx-auto px-6 pt-24 pb-32">
      <div className="mb-8">
        <Link
          href="/calendar"
          className="text-[var(--primary)] font-semibold hover:underline flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Calendar
        </Link>
      </div>

      <div className="mb-8">
        <span className="font-label text-xs uppercase tracking-widest text-[var(--secondary)] mb-2 block">Daily Overview</span>
        <h1 className="font-headline text-4xl font-extrabold text-[var(--primary)]">{formattedDate}</h1>
        {events && events.length > 0 && (
          <p className="text-[var(--on-surface-variant)] mt-2">{events.length} event(s) scheduled</p>
        )}
      </div>

      <section className="mb-8">
        <h2 className="font-headline text-2xl font-bold text-[var(--on-surface)] mb-4">Scheduled Events</h2>
        
        {!events || events.length === 0 ? (
          <div className="bg-[var(--surface-container-low)] rounded-xl p-8 text-center">
            <p className="text-[var(--on-surface-variant)]">No events scheduled for this date.</p>
            <p className="text-sm text-[var(--on-surface-variant)] mt-2">Check back later or add events from the Manager page.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((evt) => (
              <div
                key={evt.id}
                className="bg-[var(--surface-container-low)] rounded-xl p-6 border border-[var(--outline-variant)]/15"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-bold text-[var(--on-surface-variant)]">
                        {new Date(evt.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {` - ${getEventEndTime(evt.start_time, evt.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                      </span>
                      {evt.category === "major_feast" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--tertiary)] text-white uppercase">
                          Feast Day
                        </span>
                      )}
                    </div>
                    <h3 className="font-headline text-xl font-bold text-[var(--on-surface)]">{evt.title}</h3>
                    {evt.description && (
                      <p className="text-[var(--on-surface-variant)] mt-2">{evt.description}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--outline-variant)]/15">
                  <p className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-wider mb-3">Staffing Requirements</p>
                  <div className="flex flex-wrap gap-4">
                    {evt.required_ops > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[var(--primary)]" />
                        <span className="text-sm text-[var(--on-surface)]">Ops: {evt.required_ops}</span>
                      </div>
                    )}
                    {evt.required_security > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[var(--tertiary)]" />
                        <span className="text-sm text-[var(--on-surface)]">Security: {evt.required_security}</span>
                      </div>
                    )}
                    {evt.required_greeter > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[var(--secondary)]" />
                        <span className="text-sm text-[var(--on-surface)]">Greeters: {evt.required_greeter}</span>
                      </div>
                    )}
                    {evt.director_mandatory && (
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[var(--error)]" />
                        <span className="text-sm text-[var(--on-surface)]">Director Required</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-headline text-2xl font-bold text-[var(--on-surface)] mb-4">Staff On Shift</h2>
        
        {!shifts || shifts.length === 0 ? (
          <div className="bg-[var(--surface-container-low)] rounded-xl p-8 text-center">
            <p className="text-[var(--on-surface-variant)]">No staff clocked in for this date.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className="bg-[var(--surface-container-low)] rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full sacred-gradient flex items-center justify-center text-white font-display font-bold">
                  {shift.profiles?.full_name?.[0] || shift.profiles?.email?.[0] || "?"}
                </div>
                <div>
                  <p className="font-semibold text-[var(--on-surface)]">
                    {shift.profiles?.full_name || shift.profiles?.email || "Unknown"}
                  </p>
                  <p className="text-xs text-[var(--on-surface-variant)]">
                    Clocked in: {new Date(shift.clock_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {shift.clock_out && (
                      <> - {new Date(shift.clock_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
