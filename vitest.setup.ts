import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Build a Supabase mock that returns proper Supabase-shaped responses
function createMockSupabase() {
  // All chainable methods return the builder itself
  const buildQuery = () => {
    const q: any = new Proxy({}, {
      get(_, prop) {
        if (prop === 'then') return (resolve: any) => resolve({ data: null, error: null, count: 0 })
        if (prop === 'catch') return (reject: any) => Promise.resolve().catch(reject)
        if (prop === 'finally') return (cb: any) => Promise.resolve().finally(cb)
        return () => q
      },
    })
    return q
  }

  const supabase: any = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user', email: 'test@shrine.org' } }, error: null }),
    },
    from: vi.fn((table: string) => {
      const q = buildQuery()
      // Override single() to return { data, error }
      q.single = vi.fn().mockResolvedValue({ data: { role: 'operations' }, error: null })
      q.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      q.insert = vi.fn().mockReturnValue(q)
      q.update = vi.fn().mockReturnValue(q)
      q.delete = vi.fn().mockReturnValue(q)
      q.upsert = vi.fn().mockReturnValue(q)
      return q
    }),
  }
  return supabase
}

// Mock Supabase matches
vi.mock('@/utils/supabase/server', () => ({
  createServerClient: vi.fn(() => createMockSupabase()),
}))

// Mock Next.js headers/navigation
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
  })),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))
