import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isOk } from '@/shared/result'
import { createClosedDate } from '../domain/availability'
import { isClosedDateAlreadyExistsError } from '../domain/errors'

const single = vi.fn()

vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({ insert: () => ({ select: () => ({ single }) }) }),
  }),
}))

const { supabaseSchedulingRepository } = await import('../db/supabase-scheduling-repository')

function mustCreateClosedDate() {
  const built = createClosedDate({ resourceId: 'r1', closedDate: '2026-12-25' })
  if (!isOk(built)) throw new Error('fixture inválido')
  return built.value
}

describe('supabaseSchedulingRepository.saveClosedDate', () => {
  beforeEach(() => single.mockReset())

  it('traduce la violación UNIQUE (23505) a ClosedDateAlreadyExistsError', async () => {
    single.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } })
    await expect(supabaseSchedulingRepository.saveClosedDate(mustCreateClosedDate())).rejects.toSatisfy(
      isClosedDateAlreadyExistsError
    )
  })

  it('relanza cualquier otro error de base tal cual', async () => {
    const dbError = { code: '42501', message: 'permission denied' }
    single.mockResolvedValue({ data: null, error: dbError })
    await expect(supabaseSchedulingRepository.saveClosedDate(mustCreateClosedDate())).rejects.toBe(dbError)
  })
})
