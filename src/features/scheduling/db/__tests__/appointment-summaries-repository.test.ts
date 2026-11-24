import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { storageFailed } from '../../domain/errors'
import { APPOINTMENTS_TABLE } from '../appointment-repository.constants'
import {
  APPOINTMENT_SUMMARY_COLUMNS,
  createSupabaseAppointmentSummariesRepository,
} from '../appointment-summaries-repository'

const APPOINTMENT_ID = '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11'

const validRow = {
  id: APPOINTMENT_ID,
  starts_at: '2026-09-15T16:00:00+00:00',
  technique_name: 'Clásicas',
  package_name: null,
}

async function findWithFakeDb(data: unknown, error: { message: string } | null = null) {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = { then: (resolve: (value: unknown) => unknown) => resolve({ data, error }) }
  for (const method of ['select', 'in']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = { from: (table: string) => (calls.push(['from', table]), query) } as unknown as SupabaseClient
  const result = await createSupabaseAppointmentSummariesRepository(db).findByIds([APPOINTMENT_ID])
  return { result, calls }
}

describe('createSupabaseAppointmentSummariesRepository.findByIds', () => {
  it('filtra por los ids pedidos y mapea la técnica y el instante en milisegundos UTC', async () => {
    const { result, calls } = await findWithFakeDb([validRow])

    expect(calls).toEqual([
      ['from', APPOINTMENTS_TABLE],
      ['select', APPOINTMENT_SUMMARY_COLUMNS],
      ['in', 'id', [APPOINTMENT_ID]],
    ])
    expect(isOk(result) && result.value).toEqual([
      { id: APPOINTMENT_ID, startsAtMs: Date.parse('2026-09-15T16:00:00Z'), serviceName: 'Clásicas' },
    ])
  })

  it.each([
    ['el paquete si no hay técnica', { technique_name: null, package_name: 'Paquete novia' }, 'Paquete novia'],
    ['nulo si no hay ninguno', { technique_name: null, package_name: null }, null],
  ])('el nombre del servicio es %s', async (_caso, names, expected) => {
    const { result } = await findWithFakeDb([{ ...validRow, ...names }])

    expect(isOk(result) && result.value[0]?.serviceName).toBe(expected)
  })

  it('un error de la base devuelve StorageFailed y no lanza', async () => {
    const { result } = await findWithFakeDb(null, { message: 'conexión rechazada' })

    expect(isErr(result) && result.error).toEqual(storageFailed('conexión rechazada'))
  })

  it('una fila con fecha ilegible devuelve StorageFailed', async () => {
    const { result } = await findWithFakeDb([{ ...validRow, starts_at: 'ayer' }])

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
