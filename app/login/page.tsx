"use client"

export const dynamic = 'force-dynamic'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import Image from "next/image"
import { ThemeToggle } from "@/components/theme/ThemeToggle"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const routeForRole = (role: string | null | undefined) => {
    const normalized = String(role || "").toLowerCase()
    if (normalized === "manager") return "/manager"
    if (normalized === "council") return "/council"
    return "/dashboard"
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (signInError) throw signInError

      const currentUserId = signInData.user?.id
      if (currentUserId) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentUserId)
          .maybeSingle()

        if (profileError) {
          console.warn("Profile lookup failed; defaulting to dashboard.", profileError.message)
        }

        router.replace(routeForRole(profile?.role))
      } else {
        router.replace("/dashboard")
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-x-hidden bg-surface dark:bg-slate-900 py-6 sm:py-8">
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div
        className="absolute inset-0 z-0 dark:hidden bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/images/liberty-hero.jpg)' }}
      >
        <div className="absolute inset-0 bg-primary/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
      </div>

      <div className="absolute inset-0 z-0 hidden dark:block">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute top-0 left-0 w-full h-full opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#d4a017]/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[#8b7355]/20 rounded-full blur-[96px]" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-7xl px-4 sm:px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div className="relative max-w-xl rounded-[2rem] overflow-hidden shadow-2xl border border-white/20 w-full">
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/liberty-hero.jpg"
              alt="Liberty Background"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-primary/60 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/40 to-transparent" />
          </div>

          <div className="relative z-10 p-6 sm:p-8 md:p-10">
            <div className="flex flex-col items-center text-center gap-3 mb-8">
              <div className="w-12 h-12 flex items-center justify-center rounded-xl byzantine-gradient shadow-lg">
                <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  account_balance
                </span>
              </div>
              <span className="font-headline font-extrabold text-2xl tracking-tight text-white">LandmarkOps</span>
            </div>

            <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-[1.1] mb-4 -tracking-[0.03em] break-words">
              Preserve the <span className="text-secondary-fixed">Sacred</span> Heritage.
            </h1>

            <div className="rounded-2xl bg-white/10 backdrop-blur-md px-6 py-4 border border-white/20 shadow-lg">
              <p className="font-body text-sm text-white/90 leading-relaxed max-w-md break-words">
                The modern operational core for national landmarks. Manage daily liturgy, staff logistics, and site security with reverent precision.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 items-center mt-4">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
                <span className="font-label text-xs font-medium text-white tracking-wide uppercase break-words">System Status: Optimal</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end w-full">
          <div className="glass-panel dark:bg-slate-800/80 dark:border-slate-700/50 w-full max-w-md p-6 sm:p-8 md:p-10 rounded-[2rem] shadow-2xl border border-white/20">
            <div className="mb-8 sm:mb-10">
              <h2 className="font-headline text-3xl font-bold text-primary dark:text-[#d4a017] mb-2">Sign In</h2>
              <p className="text-on-surface-variant dark:text-white/60">Access your administrative workstation.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="font-label text-xs font-bold text-primary dark:text-[#d4a017] tracking-widest uppercase ml-1 block">
                  Work Email
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline dark:text-slate-400 group-focus-within:text-primary transition-colors">
                    alternate_email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@shrine.org"
                    required
                    autoComplete="email"
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low dark:bg-slate-700/50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:focus:ring-[#d4a017]/20 focus:bg-surface-container-highest transition-all outline-none font-body text-on-surface dark:text-white dark:placeholder:text-slate-400"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-label text-xs font-bold text-primary dark:text-[#d4a017] tracking-widest uppercase ml-1 block">
                  Secure Password
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline dark:text-slate-400 group-focus-within:text-primary transition-colors">
                    lock
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    required
                    autoComplete="current-password"
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low dark:bg-slate-700/50 border-none rounded-xl focus:ring-2 focus:ring-primary/20 dark:focus:ring-[#d4a017]/20 focus:bg-surface-container-highest transition-all outline-none font-body text-on-surface dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2 gap-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded bg-surface-container dark:bg-slate-700 border-none text-primary dark:text-[#d4a017] focus:ring-primary/20"
                  />
                  <span className="text-sm text-on-surface-variant dark:text-white/60 group-hover:text-primary transition-colors">
                    Remember station
                  </span>
                </label>
                <button
                  type="button"
                  className="text-sm font-semibold text-primary dark:text-[#d4a017] hover:text-primary-container transition-colors whitespace-nowrap"
                  onClick={() => router.push("/forgot-password")}
                >
                  Forgot credentials?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl gold-accents dark:bg-[#d4a017] dark:hover:bg-[#c49415] text-white font-headline font-bold text-lg shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? "Authorizing..." : "Authorize Access"}
                <span className="material-symbols-outlined">login</span>
              </button>

              {error && (
                <div className="bg-error-container dark:bg-red-900/30 text-on-error-container dark:text-red-200 text-sm p-4 rounded-xl text-center flex flex-col gap-1">
                  <p className="font-bold break-words">{error}</p>
                </div>
              )}
            </form>

            <div className="mt-10 pt-8 border-t border-outline-variant/30 text-center">
              <p className="text-on-surface-variant dark:text-white/60 text-sm mb-6">Credentialed staff and managers only.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/signup")}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-surface-container-low dark:bg-slate-700/50 hover:bg-surface-container-highest dark:hover:bg-slate-600/50 rounded-xl text-primary dark:text-[#d4a017] font-bold text-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/signup")}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-surface-container-low dark:bg-slate-700/50 hover:bg-surface-container-highest dark:hover:bg-slate-600/50 rounded-xl text-primary dark:text-[#d4a017] font-bold text-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                  New Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="relative z-10 mt-8 sm:mt-10 w-full px-4 sm:px-6 pb-4 sm:pb-6 flex flex-col md:flex-row justify-between items-center gap-4 text-white/50 dark:text-white/40 text-[10px] sm:text-xs font-medium tracking-widest uppercase text-center md:text-left">
        <div className="flex flex-wrap justify-center md:justify-start items-center gap-4 sm:gap-6">
          <span className="break-words">Created by: Paul Karaisaridis, Director of Operations 2026 National Shrine.</span>
          <span className="hidden md:inline w-1 h-1 rounded-full bg-white/20" />
          <span>Operational Portal v4.2.0</span>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-8">
          <button onClick={() => router.push("/privacy")} className="hover:text-white transition-colors whitespace-nowrap">Privacy Protocol</button>
          <button onClick={() => router.push("/security")} className="hover:text-white transition-colors whitespace-nowrap">Security Standards</button>
          <button onClick={() => router.push("/support")} className="hover:text-white transition-colors whitespace-nowrap">Support Terminal</button>
        </div>
      </footer>

      <div className="fixed top-0 right-0 p-12 pointer-events-none opacity-10">
        <div className="w-64 h-64 border-8 border-white rounded-full" />
      </div>
      <div className="fixed bottom-0 left-0 p-12 pointer-events-none opacity-5">
        <div className="w-96 h-96 border-[16px] border-secondary rounded-full" />
      </div>
    </main>
  )
}
