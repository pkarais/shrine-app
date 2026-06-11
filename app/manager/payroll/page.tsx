export const dynamic = 'force-dynamic'

import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { PayrollClient } from "@/components/payroll/PayrollClient"
import { getPayPeriod, generatePayrollData, getStaffPayRates } from "@/lib/actions/payroll"

export default async function ManagerPayrollPage({
  searchParams,
}: {
  searchParams?: { date?: string }
}) {
  const supabaseAuth = createServerClient()
  const { data: { user } } = await supabaseAuth.auth.getUser()
  const hasDevBypass = cookies().get('shrine_dev_session')?.value === 'true'
  const devRole = cookies().get('shrine_dev_role')?.value || 'manager'
  const supabase = createAdminClient()

  if (!user && !hasDevBypass) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-primary mb-4">login</span>
          <h2 className="font-headline text-3xl text-on-surface mb-2">Authentication Required</h2>
          <p className="font-body text-on-surface-variant">Please sign in to access payroll.</p>
        </div>
      </main>
    )
  }

  const profileRole = user
    ? (await supabase.from("profiles").select("role").eq("id", user.id).single()).data?.role || null
    : hasDevBypass ? devRole : null

  if (profileRole !== "manager") {
    redirect("/dashboard")
  }

  const selectedDateStr = searchParams?.date || new Date().toISOString().split('T')[0]
  const period = await getPayPeriod(selectedDateStr)
  const prevPeriod = await getPayPeriod(new Date(period.start.getTime() - 86400000))
  const nextPeriod = await getPayPeriod(new Date(period.end.getTime() + 86400000))

  // Generate payroll data
  let payrollData = null
  let error = null
  try {
    payrollData = await generatePayrollData(period.start, period.end)
  } catch (e: any) {
    error = e.message
  }

  // Get pay rates for editor
  const payRates = await getStaffPayRates()

  // Get all staff from directory for rate editor
  const admin = createAdminClient()
  const { data: staffDirectory } = await admin
    .from("staff_directory")
    .select("id, name, role, profile_id")
    .order("name", { ascending: true })

  return (
    <>
      <TopAppBar showProfile={false} />
      <main className="pt-24 pb-16 px-6 max-w-7xl mx-auto">
        <section className="mb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="font-label text-xs uppercase tracking-widest text-secondary mb-2 block">Manager Portal</span>
              <h2 className="font-headline text-5xl font-extrabold text-primary -ml-1">Payroll Report</h2>
            </div>
          </div>
        </section>

        <PayrollClient
          period={period}
          prevPeriod={prevPeriod}
          nextPeriod={nextPeriod}
          payrollData={payrollData}
          payRates={payRates}
          staffDirectory={staffDirectory || []}
          error={error}
        />
      </main>
    </>
  )
}
