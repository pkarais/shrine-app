"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import Image from "next/image"

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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      const { data: authUser } = await supabase.auth.getUser()
      const currentUserId = authUser.user?.id
      if (currentUserId) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", currentUserId).single()
        router.push(routeForRole(profile?.role))
      } else {
        router.push("/dashboard")
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message || "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-surface">
      {/* Background Hero Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1545459720-aacaf5090835?w=1920&q=80"
          alt="Shrine Background"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-primary/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
      </div>

      {/* Layout Container */}
      <div className="relative z-10 w-full max-w-7xl px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left Side: Editorial Branding */}
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-12 h-12 flex items-center justify-center rounded-xl byzantine-gradient shadow-lg">
              <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                account_balance
              </span>
            </div>
            <span className="font-headline font-extrabold text-2xl tracking-tight text-white">LandmarkOps</span>
          </div>

          <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-white leading-[1.1] mb-6 -tracking-[0.03em]">
            Preserve the <span className="text-secondary-fixed">Sacred</span> Heritage.
          </h1>

          <p className="font-body text-xl text-white/80 leading-relaxed mb-10 max-w-lg">
            The modern operational core for national landmarks. Manage daily liturgy, staff logistics, and site security with reverent precision.
          </p>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="px-6 py-3 bg-white/10 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse" />
              <span className="font-label text-sm font-medium text-white tracking-wide uppercase">System Status: Optimal</span>
            </div>
          </div>
        </div>

        {/* Right Side: Login Panel */}
        <div className="flex justify-center lg:justify-end">
          <div className="glass-panel w-full max-w-md p-8 md:p-10 rounded-[2rem] shadow-2xl border border-white/20">
            <div className="mb-10">
              <h2 className="font-headline text-3xl font-bold text-primary mb-2">Sign In</h2>
              <p className="text-on-surface-variant">Access your administrative workstation.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="font-label text-xs font-bold text-primary tracking-widest uppercase ml-1 block">
                  Work Email
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                    alternate_email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@shrine.org"
                    required
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-highest transition-all outline-none font-body text-on-surface"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-label text-xs font-bold text-primary tracking-widest uppercase ml-1 block">
                  Secure Password
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">
                    lock
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-highest transition-all outline-none font-body text-on-surface"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded bg-surface-container border-none text-primary focus:ring-primary/20"
                  />
                  <span className="text-sm text-on-surface-variant group-hover:text-primary transition-colors">
                    Remember station
                  </span>
                </label>
                <button
                  type="button"
                  className="text-sm font-semibold text-primary hover:text-primary-container transition-colors"
                  onClick={() => router.push("/forgot-password")}
                >
                  Forgot credentials?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl gold-accents text-white font-headline font-bold text-lg shadow-lg shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading ? "Authorizing..." : "Authorize Access"}
                <span className="material-symbols-outlined">login</span>
              </button>

              {error && (
                <div className="bg-error-container/50 text-error text-sm p-4 rounded-xl text-center flex flex-col gap-1">
                  <p className="font-bold">{error}</p>
                  <p className="text-xs opacity-70 italic">Ensure your Supabase project is active and URL/Key are correct in .env.local</p>
                </div>
              )}

            </form>

            <div className="mt-10 pt-8 border-t border-outline-variant/30 text-center">
              <p className="text-on-surface-variant text-sm mb-6">Credentialed staff and managers only.</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/signup")}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-surface-container-low hover:bg-surface-container-highest rounded-xl text-primary font-bold text-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                  Register
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/signup")}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-surface-container-low hover:bg-surface-container-highest rounded-xl text-primary font-bold text-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                  New Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Legal */}
      <footer className="absolute bottom-8 w-full px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-white/50 text-xs font-medium tracking-widest uppercase">
        <div className="flex items-center gap-6">
          <span>Created by: Paul Karaisaridis, Director of Operations 2026 National Shrine.</span>
          <span className="hidden md:inline w-1 h-1 rounded-full bg-white/20" />
          <span>Operational Portal v4.2.0</span>
        </div>
        <div className="flex items-center gap-8">
          <button onClick={() => router.push("/privacy")} className="hover:text-white transition-colors">Privacy Protocol</button>
          <button onClick={() => router.push("/security")} className="hover:text-white transition-colors">Security Standards</button>
          <button onClick={() => router.push("/support")} className="hover:text-white transition-colors">Support Terminal</button>
        </div>
      </footer>

      {/* Byzantine Decorative Accents */}
      <div className="fixed top-0 right-0 p-12 pointer-events-none opacity-10">
        <div className="w-64 h-64 border-8 border-white rounded-full" />
      </div>
      <div className="fixed bottom-0 left-0 p-12 pointer-events-none opacity-5">
        <div className="w-96 h-96 border-[16px] border-secondary rounded-full" />
      </div>
    </main>
  )
}
