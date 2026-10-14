import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { isWeeklyBlockOverlap } from '../../domain/availability-errors'
import {
  createSupabaseWeeklyAvailabilityRepository,
  rowToWeeklyBlock,
  weeklyBlockToRow,
} from '../weekly-availability-repository'

const block = {
  id: '11111111-1111-4111-8111-111111111111',
  resourceId: '00000000-0000-4000-8000-000000000001',
  weekday: 2,
  startMin: 540,
  endMin: 720,
}

// Cliente mínimo: solo el insert, que es donde vive el mapeo del error de la base.
const dbReturning = (error: { code: string; message: string } | null) =>
  ({ from: () => ({ insert: async () => ({ error }) }) }) as unknown as SupabaseClient

describe('weekly-availability-repository', () => {
  it('fila y dominio se convierten ida y vuelta sin perder datos', () => {
    expect(rowToWeeklyBlock(weeklyBlockToRow(block))).toEqual(block)
  })

  it('insert sin error devuelve ok', async () => {
    const repo = createSupabaseWeeklyAvailabilityRepository(dbReturning(null))
    expect(isOk(await repo.insert(block))).toBe(true)
  })

  it('la violación del exclusion constraint (23P01) se devuelve como solape', async () => {
    const repo = createSupabaseWeeklyAvailabilityRepository(
      dbReturning({ code: '23P01', message: 'conflicting key value' }),
    )
    const result = await repo.insert(block)
    expect(isErr(result) && isWeeklyBlockOverlap(result.error)).toBe(true)
  })

  it('cualquier otro error de la base se lanza', async () => {
    const repo = createSupabaseWeeklyAvailabilityRepository(
      dbReturning({ code: '42501', message: 'permission denied' }),
    )
    await expect(repo.insert(block)).rejects.toThrow('permission denied')
  })

  it('remove con un id que no es UUID no consulta la base', async () => {
    const repo = createSupabaseWeeklyAvailabilityRepository({} as SupabaseClient)
    expect(await repo.remove('no-es-uuid')).toBe(false)
  })
})
