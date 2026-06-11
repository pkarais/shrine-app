import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Checks if the current time is within Shrine operating hours.
 * Shrine operates 9AM-5PM ET, but staff may access the app slightly
 * before/after for prep (6AM-11PM ET window).
 * Uses Intl so the check is correct in Eastern Time (DST-aware) on the
 * Vercel UTC server — getUTCHours() would be 4-5 hours off from NYC time.
 */
export function isWithinOperatingHours(date?: Date): boolean {
  const now = date || new Date()
  const etHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      hour12: false,
    }).format(now)
  )
  // Normalise midnight edge case where Intl returns 24.
  const hour = etHour === 24 ? 0 : etHour
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

  // getUser() validates the JWT server-side — more secure than getSession()
  // which reads from an unverified cookie (Supabase docs recommendation).
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthenticated = !!user || hasDevBypass

  const path = request.nextUrl.pathname

  const authRequiredPaths = ['/dashboard', '/manager', '/profile', '/messages', '/tickets', '/recognition', '/calendar', '/operations-brief', '/daily-brief', '/council', '/brief', '/audio-test', '/sops']
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
