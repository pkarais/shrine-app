"use client"

import { useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { Button } from "@/components/ui/Button"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[var(--surface)]">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[var(--primary)]/40 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)] via-[var(--primary)]/60 to-transparent" />
      </div>

      <div className="fixed top-0 left-0 w-full h-1 z-50" style={{ background: "linear-gradient(135deg, #735c00, #ffdf6e)" }} />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="p-8 md:p-10 rounded-[2rem] shadow-2xl border border-white/20 glass-overlay">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full sacred-gradient mb-6">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="font-headline text-3xl font-bold text-[var(--primary)] mb-2">Forgot Password</h2>
            <p className="text-[var(--on-surface-variant)]">Enter your email and we&apos;ll send you a reset link.</p>
          </div>

          {sent ? (
            <div className="bg-[var(--secondary-container)] text-[var(--on-secondary-container)] text-sm p-6 rounded-xl text-center">
              <p className="font-bold mb-1">Check your email</p>
              <p>If an account exists for <strong>{email}</strong>, you&apos;ll receive a password reset link shortly.</p>
              <a href="/login" className="inline-block mt-4 text-sm font-semibold text-[var(--primary)] hover:underline">
                Back to Sign In
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="font-label text-xs font-bold text-[var(--primary)] tracking-widest uppercase ml-1 block">Email</label>
                <div className="relative group">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--outline)] group-focus-within:text-[var(--primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-4 bg-[var(--surface-container-low)] border-none rounded-xl focus:ring-2 focus:ring-[var(--primary)]/20 focus:bg-[var(--surface-container-highest)] transition-all outline-none font-body text-[var(--on-surface)]"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-[var(--error-container)] text-[var(--error)] text-sm p-4 rounded-xl">{error}</div>
              )}

              <Button
                type="submit"
                disabled={loading}
                variant="gold"
                size="lg"
                className="w-full py-4 rounded-xl text-white font-headline font-bold text-lg shadow-lg"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}

          <div className="mt-8 text-center">
            <a href="/login" className="text-sm font-semibold text-[var(--primary)] hover:text-[var(--primary-container)] transition-colors">
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
