import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { isManualBlockHasAppointment, isManualBlockOverlap } from '../../domain/availability-errors'
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

  it('insertMany manda todas las filas en un solo INSERT (todo o nada, US-AGE-07)', async () => {
    const insertedBatches: unknown[] = []
    const recordingDb = {
      from: () => ({
        insert: async (rows: unknown) => {
          insertedBatches.push(rows)
          return { error: null }
        },
      }),
    } as unknown as SupabaseClient
    const secondBlock = { ...block, id: '44444444-4444-4444-8444-444444444444' }
    const result = await createSupabaseManualBlockRepository(recordingDb).insertMany([block, secondBlock])
    expect(isOk(result)).toBe(true)
    expect(insertedBatches).toEqual([[manualBlockToRow(block), manualBlockToRow(secondBlock)]])
  })

  it('el rechazo del trigger por una cita activa se devuelve tipado (US-AGE-07, criterio 4)', async () => {
    const repo = createSupabaseManualBlockRepository(
      dbReturning({ code: '23514', message: 'scheduling_manual_blocks_active_appointment' }),
    )
    for (const result of [await repo.insertMany([block]), await repo.insert(block)]) {
      expect(isErr(result) && isManualBlockHasAppointment(result.error)).toBe(true)
    }
  })

  it('otro 23514 (un CHECK cualquiera) no se confunde con la cita activa', async () => {
    const repo = createSupabaseManualBlockRepository(
      dbReturning({ code: '23514', message: 'violates check constraint' }),
    )
    await expect(repo.insertMany([block])).rejects.toThrow('violates check constraint')
  })

  it('remove con un id que no es UUID no consulta la base (US-AGE-07, criterio 3)', async () => {
    const repo = createSupabaseManualBlockRepository({} as SupabaseClient)
    expect(await repo.remove('no-es-uuid')).toBe(false)
  })

  it('findById con un id que no es UUID no consulta la base y uno desconocido da null', async () => {
    expect(await createSupabaseManualBlockRepository({} as SupabaseClient).findById('no-es-uuid')).toBeNull()
    const readingDb = (data: unknown) =>
      ({
        from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data, error: null }) }) }) }),
      }) as unknown as SupabaseClient
    expect(await createSupabaseManualBlockRepository(readingDb(null)).findById(block.id)).toBeNull()
    expect(await createSupabaseManualBlockRepository(readingDb(manualBlockToRow(block))).findById(block.id)).toEqual(block)
  })

  it('shorten llama a la función de la base con el fin nuevo en UTC (US-AGE-07, criterio 3)', async () => {
    const calls: unknown[][] = []
    const rpcDb = (error: { code: string; message: string } | null) =>
      ({
        rpc: async (...args: unknown[]) => {
          calls.push(args)
          return { error }
        },
      }) as unknown as SupabaseClient
    const newEndsAt = new Date('2026-10-20T16:00:00.000Z')

    expect(await createSupabaseManualBlockRepository(rpcDb(null)).shorten(block.id, newEndsAt)).toBe(true)
    expect(calls).toEqual([
      ['scheduling_shorten_manual_block', { p_block_id: block.id, p_new_ends_at: '2026-10-20T16:00:00.000Z' }],
    ])
    expect(
      await createSupabaseManualBlockRepository(rpcDb({ code: 'P0002', message: 'scheduling_manual_block_not_found' })).shorten(
        block.id,
        newEndsAt,
      ),
    ).toBe(false)
    await expect(
      createSupabaseManualBlockRepository(rpcDb({ code: '22023', message: 'scheduling_manual_block_not_shortened' })).shorten(
        block.id,
        newEndsAt,
      ),
    ).rejects.toThrow('scheduling_manual_block_not_shortened')
  })

  it('shorten con un id que no es UUID no consulta la base', async () => {
    expect(await createSupabaseManualBlockRepository({} as SupabaseClient).shorten('no-es-uuid', new Date())).toBe(false)
  })

  it('remove devuelve si borró una fila', async () => {
    const deletingDb = (deletedRows: unknown[]) =>
      ({
        from: () => ({ delete: () => ({ eq: () => ({ select: async () => ({ data: deletedRows, error: null }) }) }) }),
      }) as unknown as SupabaseClient
    expect(await createSupabaseManualBlockRepository(deletingDb([{ id: block.id }])).remove(block.id)).toBe(true)
    expect(await createSupabaseManualBlockRepository(deletingDb([])).remove(block.id)).toBe(false)
  })
})
