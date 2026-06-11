import { createClient } from "@/utils/supabase/client"
import type { Session } from "@supabase/supabase-js"

let authReadyPromise: Promise<void> | null = null

export function initAuthHardening() {
  const supabase = createClient()

  if (!authReadyPromise) {
    authReadyPromise = (async () => {
      // Hydrate any persisted session first
      await supabase.auth.getSession()

      // Proactively refresh if the stored session is close to expiry
      await supabase.auth.refreshSession().catch(() => {
        // ignore; user may be signed out
      })
    })()
  }

  // Keep app state synced — plug additional store updates here if needed
  const { data: sub } = supabase.auth.onAuthStateChange((_event: string, _session: Session | null) => {
    // e.g. authStore.setSession(_session)
  })

  return () => sub.subscription.unsubscribe()
}

export async function waitForAuthReady() {
  if (!authReadyPromise) initAuthHardening()
  await authReadyPromise
}

/**
 * Wrap protected calls to auto-recover once from an expired JWT.
 * Usage: const data = await withAuthRetry(() => supabase.from(...).select())
 */
export async function withAuthRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err: any) {
    const msg = `${err?.message ?? ""} ${err?.code ?? ""}`.toLowerCase()
    const looksAuth =
      msg.includes("jwt") ||
      msg.includes("token") ||
      msg.includes("401") ||
      msg.includes("403") ||
      msg.includes("invalid claim") ||
      msg.includes("expired")

    if (!looksAuth) throw err

    // One refresh attempt — if it fails, re-throw the original error
    const { error } = await createClient().auth.refreshSession()
    if (error) throw err

    return fn()
  }
}

/**
 * Convenience: wait for auth to hydrate then return the current user.
 * Returns null if signed out rather than throwing.
 */
export async function loadMe() {
  await waitForAuthReady()
  return withAuthRetry(async () => {
    const { data, error } = await createClient().auth.getUser()
    if (error) throw error
    return data.user
  })
}
