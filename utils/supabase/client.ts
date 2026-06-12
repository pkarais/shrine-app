import { createBrowserClient } from "@supabase/ssr"

// We intentionally do NOT cache a module-level singleton here.
// A cached singleton causes session bleed: if user A signs out and user B
// signs in on the same tab, the old client's auth state lingers and
// subsequent queries execute with the wrong identity.
// Instead we create a new client per call. The underlying @supabase/ssr
// implementation is lightweight enough that this has no meaningful perf cost.
export const createClient = () => {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export const fetchWithRetry = async (
  fn: () => Promise<any>,
  retries = 3,
  delayMs = 1000
): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err: any) {
      const isRateLimit =
        err.message?.includes("rate limit") ||
        err.message?.includes("429") ||
        err.message?.includes("too many") ||
        err.status === 429

      if (!isRateLimit || i === retries - 1) throw err

      const waitTime = delayMs * Math.pow(2, i) + Math.random() * 500
      await new Promise((resolve) => setTimeout(resolve, waitTime))
    }
  }
}
