import { NextResponse, type NextRequest } from "next/server"

const RATE_LIMIT_WINDOW_MS = 60 * 1000
const MAX_ATTEMPTS = 5
const attempts = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(request: NextRequest, key?: string): NextResponse | null {
  const identifier = key || request.ip || "unknown"
  const now = Date.now()
  const entry = attempts.get(identifier)

  if (!entry || now > entry.resetAt) {
    attempts.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return null
  }

  entry.count++

  if (entry.count > MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    )
  }

  return null
}
