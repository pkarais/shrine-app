import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCurrentOrNextEvent } from '../event-context'
import { createServerClient } from '@/utils/supabase/server'

vi.mock('@/utils/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

describe('getCurrentOrNextEvent', () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } }),
    },
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(createServerClient as any).mockReturnValue(mockSupabase)
  })

  it('should fetch the next event including those with null end_time', async () => {
    mockSupabase.limit.mockResolvedValue({ data: [{ id: 1, title: 'Open Event' }], error: null })

    const result = await getCurrentOrNextEvent()

    expect(mockSupabase.from).toHaveBeenCalledWith('events')
    expect(mockSupabase.or).toHaveBeenCalledWith(expect.stringContaining('end_time.is.null'))
    expect(result).toEqual({ id: 1, title: 'Open Event' })
  })

  it('should return null if no event is found', async () => {
    mockSupabase.limit.mockResolvedValue({ data: [], error: null })

    const result = await getCurrentOrNextEvent()

    expect(result).toBeNull()
  })

  it('should return null on database error', async () => {
    mockSupabase.limit.mockResolvedValue({ data: null, error: { message: 'DB Error' } })

    const result = await getCurrentOrNextEvent()

    expect(result).toBeNull()
  })
})
