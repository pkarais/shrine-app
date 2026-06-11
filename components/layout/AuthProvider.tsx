"use client"

import { useEffect } from "react"
import { initAuthHardening } from "@/lib/auth-hardening"

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // initAuthHardening must only run on the client — calling createClient()
    // at module level (the old pattern) would also execute during SSR and
    // throw because browser APIs are unavailable server-side.
    // The returned cleanup unsubscribes the onAuthStateChange listener.
    const cleanup = initAuthHardening()
    return cleanup
  }, [])

  return <>{children}</>
}
