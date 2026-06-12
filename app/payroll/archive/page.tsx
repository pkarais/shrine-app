import { redirect } from "next/navigation"
import Link from "next/link"
import { createServerClient } from "@/utils/supabase/server"
import { getArchivedPayrollReports } from "@/lib/actions/payroll"
import { CalendarDays, DollarSign, FileText, ArrowLeft } from "lucide-react"

export default async function PayrollArchivePage() {
  // Auth guard — payroll data is sensitive; require authenticated manager
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || (profile.role !== "manager" && profile.role !== "admin")) {
    redirect("/dashboard")
  }

  const reports = await getArchivedPayrollReports()

  return (
    <main className="min-h-screen bg-surface">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <Link href="/manager/payroll" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary">
          <ArrowLeft className="w-4 h-4" />
          Back to Payroll
        </Link>

        <div className="mb-8">
          <h1 className="font-headline text-4xl font-black text-primary mb-2">Payroll Archive</h1>
          <p className="text-sm text-on-surface-variant">All archived biweekly payroll reports.</p>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-20 bg-surface-container-low rounded-2xl">
            <FileText className="w-12 h-12 mx-auto text-on-surface-variant opacity-30 mb-3" />
            <p className="text-sm text-on-surface-variant font-medium">No archived payroll reports yet.</p>
            <p className="text-xs text-on-surface-variant opacity-60 mt-1">
              Generate and archive a report from the manager payroll page.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => {
              const content = report.content as any
              const periodLabel = content?.period?.label || report.title
              const staffCount = content?.staffRows?.length || 0
              const totalPay = content?.grandTotalPay || 0

              return (
                <Link
                  key={report.id}
                  href={`/payroll/${report.slug}`}
                  className="block card-surface rounded-2xl p-6 hover:bg-surface-container-high transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="font-headline text-lg font-bold text-on-surface">{report.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {periodLabel}
                        </span>
                        {report.prepared_by_name && (
                          <span>by {report.prepared_by_name}</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          report.status === "published"
                            ? "bg-primary-container text-on-primary-container"
                            : report.status === "archived"
                            ? "bg-surface-container-highest text-on-surface-variant"
                            : "bg-tertiary-container text-on-tertiary-container"
                        }`}>
                          {report.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Staff</p>
                        <p className="font-bold text-on-surface">{staffCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Total</p>
                        <p className="font-bold text-secondary">${totalPay.toFixed(2)}</p>
                      </div>
                      <DollarSign className="w-5 h-5 text-primary opacity-50" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
