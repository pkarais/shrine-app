import { createServerClient, createAdminClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export async function ProfileCard({ user }: { user: any }) {
  const { data: profile } = user
    ? await createAdminClient().from("profiles").select("*").eq("id", user.id).single()
    : { data: null }

  const effectiveRole = profile?.role || user?.role || null

  const roleLabel = effectiveRole
    ? effectiveRole.charAt(0).toUpperCase() + effectiveRole.slice(1)
    : "Staff Member"

  const roleBadgeColor =
    effectiveRole === "operations"
      ? "bg-primary-fixed text-on-primary-fixed"
      : effectiveRole === "security"
      ? "bg-tertiary-container text-on-tertiary-container"
      : effectiveRole === "manager"
      ? "bg-secondary-container text-on-secondary-container"
      : "bg-surface-container text-on-surface-variant"

  if (!user) {
    return (
      <section className="card-surface p-8 text-center">
        <p className="body-md text-on-surface-variant">Not authenticated</p>
      </section>
    )
  }

  return (
    <section className="card-surface p-8">
      <div className="flex items-center gap-6 mb-6">
        <div className="w-20 h-20 rounded-full sacred-gradient flex items-center justify-center text-white font-display font-bold text-2xl">
          {user.email?.[0].toUpperCase() ?? "U"}
        </div>
        <div>
          <h2 className="headline-sm text-on-surface">{user.email}</h2>
          <span className={`inline-block text-xs label-text mt-1 px-2.5 py-1 rounded-full font-semibold ${roleBadgeColor}`}>
            {roleLabel}
          </span>
        </div>
      </div>
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-3 body-md text-on-surface-variant">
          <span className="material-symbols-outlined text-primary">mail</span>
          <span>{user.email}</span>
        </div>
        <div className="flex items-center gap-3 body-md text-on-surface-variant">
          <span className="material-symbols-outlined text-primary">calendar_today</span>
          <span>Joined {new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        </div>
      </div>
      <form
        action={async () => {
          "use server"
          const supabase = createServerClient()
          await supabase.auth.signOut()

          const cookieStore = cookies()
          cookieStore.set("shrine_dev_session", "", { path: "/", maxAge: 0 })
          cookieStore.set("shrine_dev_role", "", { path: "/", maxAge: 0 })
          cookieStore.set("shrine_dev_name", "", { path: "/", maxAge: 0 })

          redirect("/login")
        }}
      >
        <button
          type="submit"
          className="w-full py-3 px-6 rounded-xl bg-surface-container text-on-surface font-semibold hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">logout</span> Sign Out
        </button>
      </form>
    </section>
  )
}
