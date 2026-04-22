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
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // Auth guard: redirect unauthenticated users
  const isAuthPage = request.nextUrl.pathname === '/' || 
                     request.nextUrl.pathname.startsWith('/dashboard') ||
                     request.nextUrl.pathname.startsWith('/manager') ||
                     request.nextUrl.pathname.startsWith('/profile') ||
                     request.nextUrl.pathname.startsWith('/messages')
  
  // Dev Bypass: check for local dev session
  const hasDevBypass = request.cookies.get('shrine_dev_session')?.value === 'true'

  if (isAuthPage && !user && !hasDevBypass) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|login|signup).*)',
  ],
}
