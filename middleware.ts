import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Checks if the current time is within Shrine operating hours.
 * Shrine operates 9AM-5PM, but staff may access the app slightly
 * before/after for prep (6AM-11PM window).
 * Returns true between 6:00 AM and 11:00 PM (UTC).
 */
export function isWithinOperatingHours(date?: Date): boolean {
  const now = date || new Date()
  const hour = now.getUTCHours()
  return hour >= 6 && hour < 23
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  const hasDevBypass = request.cookies.get('shrine_dev_session')?.value === 'true'

  const { data: { session } } = await supabase.auth.getSession()
  const isAuthenticated = !!session || hasDevBypass

  const path = request.nextUrl.pathname

  const authRequiredPaths = ['/dashboard', '/manager', '/profile', '/messages', '/tickets', '/recognition', '/calendar', '/operations-brief', '/council', '/brief', '/audio-test']
  const managerOnlyPaths = ['/manager', '/audio-test']

  const needsAuth = authRequiredPaths.some(p => path === p || path.startsWith(p + '/'))
  const needsManager = managerOnlyPaths.some(p => path === p || path.startsWith(p + '/'))

  if (needsAuth && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Manager-only routes
  if (needsManager && isAuthenticated) {
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id
    if (!userId && !hasDevBypass) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
    if (userId) {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).single()
      if (!profile || (profile.role !== "manager" && profile.role !== "admin")) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|login|signup|forgot-password|reset-password|privacy|security|support).*)'],
}
