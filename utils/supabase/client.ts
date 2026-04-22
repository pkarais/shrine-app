import { createBrowserClient } from "@supabase/ssr"

let client: ReturnType<typeof createBrowserClient> | null = null

export const createClient = () => {
  if (client) return client

  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          "X-Client-Info": "shrine-ops/1.0",
        },
        fetch: async (url, options = {}) => {
          return fetch(url, {
            ...options,
            next: { revalidate: 60 },
          })
        },
      },
    }
  )

  return client
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
