"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import Image from "next/image"

export default function SignupPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // 1. Check Staff Directory for Role Assignment
      const { data: directoryEntry } = await supabase
        .from('staff_directory')
        .select('role')
        .ilike('name', fullName)
        .single()

      const assignedRole = directoryEntry?.role || 'operations'

      // 2. Perform Supabase Auth Signup
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone,
            role: assignedRole,
          }
        }
      })

      if (signUpError) throw signUpError

      setSuccess(true)
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (err: any) {
      setError(err.message || "Failed to create account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-surface">
      {/* Background Hero Image */}
      <div className="absolute inset-0 z-0 text-white">
        <Image
          src="https://images.unsplash.com/photo-1549413970-dcb62a1498b8?w=1920&q=80"
          alt="Sacred Space"
          fill
          priority
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-primary/60 mix-blend-multiply" />
      </div>

      <div className="relative z-10 w-full max-w-md p-8 md:p-10 glass-panel rounded-[2rem] shadow-2xl border border-white/20">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-2xl byzantine-gradient shadow-lg">
            <span className="material-symbols-outlined text-white text-3xl">person_add</span>
          </div>
          <h1 className="font-headline text-3xl font-bold text-primary">Join the Registry</h1>
          <p className="text-on-surface-variant text-sm mt-2">Create your operational credentials.</p>
        </div>

        {success ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-4xl animate-bounce">check_circle</span>
            </div>
            <h2 className="headline-md text-primary font-bold">Request Pending</h2>
            <p className="body-md text-on-surface-variant">Your profile has been created and mapped to your operational role. Redirecting to terminal...</p>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary uppercase tracking-widest ml-1">Full Legal Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="As it appears on the roster"
                required
                className="w-full px-4 py-3 bg-white/40 border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary uppercase tracking-widest ml-1">Registry Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/40 border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary uppercase tracking-widest ml-1">Emergency Contact (Phone)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/40 border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-primary uppercase tracking-widest ml-1">Secure Passkey</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/40 border-none rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 byzantine-gradient text-white rounded-xl font-headline font-bold shadow-lg shadow-primary/20 hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              {loading ? "Establishing Connection..." : "Register Credentials"}
            </button>

            {error && <p className="text-error text-[10px] font-bold text-center bg-error/5 p-2 rounded-lg">{error}</p>}
            
            <p className="text-center text-[10px] text-on-surface-variant pt-4">
              Already credentialed? <button type="button" onClick={() => router.push("/login")} className="text-primary font-bold">Sign In</button>
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
