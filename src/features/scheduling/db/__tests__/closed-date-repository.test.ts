import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { isClosedDateAlreadyExists, isClosedDateHasAppointment } from '../../domain/availability-errors'
import {
  closedDateToRow,
  createSupabaseClosedDateRepository,
  rowToClosedDate,
} from '../closed-date-repository'

const closedDate = {
  id: '22222222-2222-4222-8222-222222222222',
  resourceId: '00000000-0000-4000-8000-000000000001',
  date: '2026-12-25',
  kind: 'holiday' as const,
  label: 'Navidad',
}

const dbReturning = (error: { code: string; message: string } | null) =>
  ({ from: () => ({ insert: async () => ({ error }) }) }) as unknown as SupabaseClient

describe('closed-date-repository', () => {
  it('fila y dominio se convierten ida y vuelta sin perder datos', () => {
    expect(rowToClosedDate(closedDateToRow(closedDate))).toEqual(closedDate)
  })

  it('insert sin error devuelve ok', async () => {
    const repo = createSupabaseClosedDateRepository(dbReturning(null))
    expect(isOk(await repo.insert(closedDate))).toBe(true)
  })

  it('la violación del UNIQUE (23505) se devuelve como día ya cerrado', async () => {
    const repo = createSupabaseClosedDateRepository(
      dbReturning({ code: '23505', message: 'duplicate key value' }),
    )
    const result = await repo.insert(closedDate)
    expect(isErr(result) && isClosedDateAlreadyExists(result.error)).toBe(true)
  })

  it('el rechazo de la base por una cita activa (23514) se devuelve como error tipado, sin lanzar', async () => {
    const repo = createSupabaseClosedDateRepository(
      dbReturning({ code: '23514', message: 'scheduling_closed_dates_active_appointment' }),
    )
    const result = await repo.insert(closedDate)
    expect(isErr(result) && isClosedDateHasAppointment(result.error)).toBe(true)
  })

  it('otro 23514 no se confunde con la cita activa y se lanza', async () => {
    const repo = createSupabaseClosedDateRepository(dbReturning({ code: '23514', message: 'violates check constraint' }))
    await expect(repo.insert(closedDate)).rejects.toThrow('violates check constraint')
  })

  it('cualquier otro error de la base se lanza', async () => {
    const repo = createSupabaseClosedDateRepository(
      dbReturning({ code: '42501', message: 'permission denied' }),
    )
    await expect(repo.insert(closedDate)).rejects.toThrow('permission denied')
  })

  it('remove con un id que no es UUID no consulta la base', async () => {
    const repo = createSupabaseClosedDateRepository({} as SupabaseClient)
    expect(await repo.remove('no-es-uuid')).toBe(false)
  })
})
