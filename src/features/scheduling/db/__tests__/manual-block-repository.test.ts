import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { isManualBlockOverlap } from '../../domain/availability-errors'
import {
  createSupabaseManualBlockRepository,
  manualBlockToRow,
  rowToManualBlock,
} from '../manual-block-repository'

const block = {
  id: '33333333-3333-4333-8333-333333333333',
  resourceId: '00000000-0000-4000-8000-000000000001',
  startsAt: new Date('2026-10-20T15:00:00.000Z'),
  endsAt: new Date('2026-10-20T17:00:00.000Z'),
  reason: 'cita médica',
}

const dbReturning = (error: { code: string; message: string } | null) =>
  ({ from: () => ({ insert: async () => ({ error }) }) }) as unknown as SupabaseClient

describe('manual-block-repository', () => {
  it('fila y dominio se convierten ida y vuelta; los instantes viajan en UTC', () => {
    const row = manualBlockToRow(block)
    expect(row.starts_at).toBe('2026-10-20T15:00:00.000Z')
    expect(rowToManualBlock(row)).toEqual(block)
  })

  it('lee el timestamptz que devuelve PostgREST con desfase', () => {
    const fromDb = rowToManualBlock({
      ...manualBlockToRow(block),
      starts_at: '2026-10-20T15:00:00+00:00',
    })
    expect(fromDb.startsAt.toISOString()).toBe('2026-10-20T15:00:00.000Z')
  })

  it('insert sin error devuelve ok', async () => {
    const repo = createSupabaseManualBlockRepository(dbReturning(null))
    expect(isOk(await repo.insert(block))).toBe(true)
  })

  it('la violación del exclusion constraint (23P01) se devuelve como solape', async () => {
    const repo = createSupabaseManualBlockRepository(
      dbReturning({ code: '23P01', message: 'conflicting key value' }),
    )
    const result = await repo.insert(block)
    expect(isErr(result) && isManualBlockOverlap(result.error)).toBe(true)
  })

  it('cualquier otro error de la base se lanza', async () => {
    const repo = createSupabaseManualBlockRepository(
      dbReturning({ code: '42501', message: 'permission denied' }),
    )
    await expect(repo.insert(block)).rejects.toThrow('permission denied')
  })
})
