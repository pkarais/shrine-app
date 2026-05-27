"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/Button"
import type { AuthChangeEvent, Session } from "@supabase/supabase-js"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionChecking, setSessionChecking] = useState(true)
  const [sessionValid, setSessionValid] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const checkSession = async () => {
      const result = await supabase.auth.getSession()
      setSessionValid(!!result.data.session)
      setSessionChecking(false)
    }
    checkSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setSessionValid(true)
        setSessionChecking(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.")
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-surface">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-primary/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
      </div>

      <div className="fixed top-0 left-0 w-full h-1 z-50" style={{ background: "linear-gradient(135deg, #735c00, #ffdf6e)" }} />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="p-8 md:p-10 rounded-[2rem] shadow-2xl border border-white/20 glass-overlay">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full sacred-gradient mb-6">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h2 className="font-headline text-3xl font-bold text-primary mb-2">Reset Password</h2>
            <p className="text-on-surface-variant">Enter your new password below.</p>
          </div>

          {sessionChecking ? (
            <div className="text-center text-on-surface-variant py-8">Verifying reset link…</div>
          ) : !sessionValid ? (
            <div className="bg-error-container text-error text-sm p-6 rounded-xl text-center">
              <p className="font-bold mb-1">Reset link expired or invalid</p>
              <p>Please request a new password reset link.</p>
              <a href="/forgot-password" className="inline-block mt-4 text-sm font-semibold text-primary hover:underline">
                Request new link
              </a>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="font-label text-xs font-bold text-primary tracking-widest uppercase ml-1 block">New Password</label>
              <div className="relative group">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-highest transition-all outline-none font-body text-on-surface"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-label text-xs font-bold text-primary tracking-widest uppercase ml-1 block">Confirm Password</label>
              <div className="relative group">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-outline group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-highest transition-all outline-none font-body text-on-surface"
                />
              </div>
            </div>

            {error && (
              <div className="bg-error-container text-error text-sm p-4 rounded-xl">{error}</div>
            )}

            {success && (
              <div className="bg-secondary-container text-on-secondary-container text-sm p-4 rounded-xl">
                Password updated successfully. Redirecting to login...
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || success}
              variant="gold"
              size="lg"
              className="w-full py-4 rounded-xl text-white font-headline font-bold text-lg shadow-lg"
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
          )}

          <div className="mt-8 text-center">
            <a href="/login" className="text-sm font-semibold text-primary hover:text-primary-container transition-colors">
              Back to Sign In
            </a>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-8 w-full px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-white/50 text-xs font-medium tracking-widest uppercase">
        <div className="flex items-center gap-6">
          <span>© 2026 St. Nicholas Shrine</span>
          <span className="hidden md:inline w-1 h-1 rounded-full bg-white/20" />
          <span>Operational Portal v0.1.0</span>
        </div>
      </footer>
    </div>
  )
}
