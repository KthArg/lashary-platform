import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { isWeeklyBlockHasAppointment, isWeeklyBlockOverlap } from '../../domain/availability-errors'
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

  describe('remove', () => {
    const deletingDb = (result: { data?: unknown[]; error?: { code: string; message: string } | null }) =>
      ({
        from: () => ({
          delete: () => ({ eq: () => ({ select: async () => ({ data: result.data ?? null, error: result.error ?? null }) }) }),
        }),
      }) as unknown as SupabaseClient

    it('con un id que no es UUID no consulta la base y dice que no existía', async () => {
      const repo = createSupabaseWeeklyAvailabilityRepository({} as SupabaseClient)
      const result = await repo.remove('no-es-uuid')
      expect(isOk(result) && result.value).toBe(false)
    })

    it('devuelve si borró una fila', async () => {
      const removed = await createSupabaseWeeklyAvailabilityRepository(deletingDb({ data: [{ id: block.id }] })).remove(block.id)
      const missing = await createSupabaseWeeklyAvailabilityRepository(deletingDb({ data: [] })).remove(block.id)
      expect(isOk(removed) && removed.value).toBe(true)
      expect(isOk(missing) && missing.value).toBe(false)
    })

    it('el rechazo de la base por citas activas (23514) se devuelve como error tipado, sin lanzar', async () => {
      const repo = createSupabaseWeeklyAvailabilityRepository(
        deletingDb({ error: { code: '23514', message: 'scheduling_weekly_availability_active_appointments' } }),
      )
      const result = await repo.remove(block.id)
      expect(isErr(result) && isWeeklyBlockHasAppointment(result.error)).toBe(true)
    })

    it('otro 23514 o cualquier otro error de la base se lanza', async () => {
      for (const error of [
        { code: '23514', message: 'violates check constraint' },
        { code: '42501', message: 'permission denied' },
      ]) {
        await expect(createSupabaseWeeklyAvailabilityRepository(deletingDb({ error })).remove(block.id)).rejects.toThrow(
          error.message,
        )
      }
    })
  })
})
