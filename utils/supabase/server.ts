import { createServerClient as createClient } from "@supabase/ssr"
import { createClient as createAdmin } from "@supabase/supabase-js"
import { cookies } from "next/headers"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const createServerClient = () => {
  const cookieStore = cookies()

  return createClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options })
          } catch (error) {
            // The `remove` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export const createAdminClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase environment variables are missing. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    )
  }

  if (!serviceRoleKey) {
    // In production the service role key MUST be present. Falling back to the
    // anon key would silently pass RLS checks using the wrong identity and
    // return empty data with no error — a silent failure that is very hard to
    // debug. Throw loudly instead so the misconfiguration is immediately obvious.
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. Admin operations require the service role key. " +
      "Set this environment variable in your Vercel project settings or local .env file."
    )
  }

  return createAdmin(supabaseUrl, serviceRoleKey)
}
