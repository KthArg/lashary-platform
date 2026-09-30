import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClosedDate } from '../domain/availability'
import { ClosedDateAlreadyExistsError } from '../domain/errors'

const single = vi.fn()

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({ insert: () => ({ select: () => ({ single }) }) }),
  }),
}))

const { supabaseSchedulingRepository } = await import('../db/supabase-scheduling-repository')

describe('supabaseSchedulingRepository.saveClosedDate', () => {
  beforeEach(() => single.mockReset())

  it('traduce la violación UNIQUE (23505) a ClosedDateAlreadyExistsError', async () => {
    single.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } })
    const closedDate = new ClosedDate({ resourceId: 'r1', closedDate: '2026-12-25' })
    await expect(supabaseSchedulingRepository.saveClosedDate(closedDate)).rejects.toBeInstanceOf(
      ClosedDateAlreadyExistsError
    )
  })

  it('relanza cualquier otro error de base tal cual', async () => {
    const dbError = { code: '42501', message: 'permission denied' }
    single.mockResolvedValue({ data: null, error: dbError })
    const closedDate = new ClosedDate({ resourceId: 'r1', closedDate: '2026-12-25' })
    await expect(supabaseSchedulingRepository.saveClosedDate(closedDate)).rejects.toBe(dbError)
  })
})
