export const dynamic = "force-dynamic"

import { createServerClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { TopAppBar } from "@/components/layout/TopAppBar"
import { ScheduleUploadClient } from "@/components/manager/ScheduleUploadClient"

export default async function ScheduleUploadPage() {
  const supabase = createServerClient()
  const cookieStore = cookies()
  const hasDevBypass = cookieStore.get("shrine_dev_session")?.value === "true"
  const devRole = cookieStore.get("shrine_dev_role")?.value || ""

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user && !hasDevBypass) redirect("/login")

  let role = devRole
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
    role = profile?.role || ""
  }

  if (role !== "manager") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface px-6">
        <div className="text-center max-w-md">
          <span className="material-symbols-outlined text-6xl text-primary mb-4">lock</span>
          <h2 className="font-headline text-3xl text-on-surface mb-2">Manager Access Only</h2>
          <p className="font-body text-on-surface-variant mb-6">
            Schedule upload is restricted to managers.
          </p>
          <Link href="/dashboard" className="text-primary underline">
            Back to dashboard
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-surface">
      <TopAppBar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-headline font-bold text-3xl sm:text-4xl text-on-surface">
              Upload Staff Schedule
            </h1>
            <p className="text-on-surface-variant mt-2 max-w-2xl">
              Drop the two-week schedule PDF you receive by email. We&apos;ll parse it,
              show you a preview, then publish it as the live source of truth.
            </p>
          </div>
          <Link
            href="/manager"
            className="text-sm text-on-surface-variant underline hover:text-on-surface"
          >
            ← Command Center
          </Link>
        </div>

        <ScheduleUploadClient />
      </div>
    </main>
  )
}
