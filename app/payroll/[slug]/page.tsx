import Link from "next/link"
import { notFound } from "next/navigation"
import { getPayrollReportBySlug } from "@/lib/actions/payroll"
import { CalendarDays, Download, FileText, DollarSign, Clock, Users } from "lucide-react"

export default async function PayrollPublicPage({ params }: { params: { slug: string } }) {
  const report = await getPayrollReportBySlug(params.slug)
  if (!report) notFound()

  const content = report.content as any
  const periodLabel = content?.period?.label || report.title
  const staffRows = content?.staffRows || []
  const grandTotalHours = content?.grandTotalHours || 0
  const grandTotalPay = content?.grandTotalPay || 0
  const generatedAt = content?.generatedAt || report.created_at

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <Link href="/payroll/archive" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
          &larr; Back to Archive
        </Link>

        <article className="overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface-container-lowest shadow-xl">
          <header className="relative bg-surface p-8 text-on-surface">
            <div className="flex flex-wrap items-center gap-4 text-sm text-on-surface-variant">
              <span className="inline-flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                Payroll
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Hours
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Staff
              </span>
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.25em] text-on-surface-variant">Biweekly Payroll Report</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight md:text-5xl">{report.title}</h1>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-on-surface-variant">
              <CalendarDays className="w-4 h-4" />
              <span>{periodLabel}</span>
              {report.prepared_by_name && (
                <>
                  <span className="text-outline">|</span>
                  <span>Prepared by {report.prepared_by_name}</span>
                </>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {report.pdf_url && (
                <a href={report.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-on-secondary">
                  <Download className="w-4 h-4" /> Download PDF
                </a>
              )}
            </div>
          </header>

          {/* Metrics */}
          <section className="grid gap-3 bg-surface-container-low p-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Staff Members</p>
              <p className="mt-1 text-3xl font-black text-on-surface">{staffRows.length}</p>
            </div>
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Total Hours</p>
              <p className="mt-1 text-3xl font-black text-on-surface">{grandTotalHours.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">Total Payroll</p>
              <p className="mt-1 text-3xl font-black text-on-surface">${grandTotalPay.toFixed(2)}</p>
            </div>
          </section>

          {/* Staff Table */}
          <div className="p-6 overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr className="border-b-2 border-outline-variant/30">
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant">Staff</th>
                  <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant">Role</th>
                  <th className="text-right px-4 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant">Rate</th>
                  <th className="text-right px-4 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant">Total Hrs</th>
                  <th className="text-right px-4 py-3 text-[11px] uppercase tracking-widest text-on-surface-variant">Gross Pay</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.map((row: any) => (
                  <tr key={row.staffId || row.profileId} className="border-b border-outline-variant/10 hover:bg-surface-container-higher/30">
                    <td className="px-4 py-3">
                      <span className="font-bold text-sm text-on-surface">{row.name}</span>
                    </td>
                    <td className="px-4 py-3 text-xs uppercase tracking-widest text-on-surface-variant">{row.role}</td>
                    <td className="px-4 py-3 text-right text-sm text-on-surface-variant">${row.hourlyRate.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-primary">{row.totalHours.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-secondary">${row.grossPay.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-outline-variant/30 bg-surface-container-higher/50">
                  <td className="px-4 py-3 font-headline font-bold text-sm text-on-surface" colSpan={3}>
                    Grand Total
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-black text-primary">{grandTotalHours.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-sm font-black text-secondary">${grandTotalPay.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <footer className="border-t border-outline-variant/30 bg-surface-container-low p-6 text-center text-xs text-on-surface-variant">
            <p className="font-bold">Shrine Operations Payroll Report</p>
            <p className="mt-1">Generated {new Date(generatedAt).toLocaleString()}</p>
            <p className="mt-1">Source of Truth: Operations App + Supabase Records</p>
            <p className="mt-1">
              Archive: <a href="/payroll/archive" className="underline text-primary">Payroll Archive</a>
            </p>
          </footer>
        </article>
      </div>
    </main>
  )
}
