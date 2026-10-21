import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseMyAppointmentsRepository } from '../my-appointments-repository'
import { APPOINTMENTS_TABLE } from '../appointment-repository.constants'
import { MY_APPOINTMENT_COLUMNS, MY_APPOINTMENTS_LIMIT } from '../my-appointments-repository.constants'

const NOW_MS = Date.parse('2027-09-01T12:00:00Z')
const row = {
  id: 'cita-1',
  starts_at: '2027-09-10T15:00:00+00:00',
  ends_at: '2027-09-10T16:00:00+00:00',
  technique_name: 'Clásicas',
  status: 'approved',
  is_first_time: true,
  service_price: 35000,
  deposit_required: 10000,
}

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: Array<[string, ...unknown[]]> = []
  const query = {
    select: (columns: string) => (calls.push(['select', columns]), query),
    in: (column: string, values: unknown) => (calls.push(['in', column, values]), query),
    gt: (column: string, value: unknown) => (calls.push(['gt', column, value]), query),
    not: (column: string, operator: string, value: unknown) => (calls.push(['not', column, operator, value]), query),
    order: (column: string, options: unknown) => (calls.push(['order', column, options]), query),
    limit: async (count: number) => (calls.push(['limit', count]), response),
  }
  const db = { from: (table: string) => (calls.push(['from', table]), query) } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabaseMyAppointmentsRepository', () => {
  it('pide solo las citas activas que no empezaron, las más próximas primero y con tope', async () => {
    const { db, calls } = createFakeDb({ data: [row], error: null })
    const result = await createSupabaseMyAppointmentsRepository(db).listUpcoming(NOW_MS)

    expect(calls).toEqual([
      ['from', APPOINTMENTS_TABLE],
      ['select', MY_APPOINTMENT_COLUMNS],
      ['in', 'status', ['pending_approval', 'approved', 'confirmed']],
      ['gt', 'starts_at', '2027-09-01T12:00:00.000Z'],
      ['not', 'client_id', 'is', null],
      ['order', 'starts_at', { ascending: true }],
      ['limit', MY_APPOINTMENTS_LIMIT],
    ])
    expect(isOk(result) && result.value).toEqual([
      {
        id: 'cita-1',
        startsAtMs: Date.parse('2027-09-10T15:00:00Z'),
        endsAtMs: Date.parse('2027-09-10T16:00:00Z'),
        techniqueName: 'Clásicas',
        status: 'approved',
        isFirstTime: true,
        servicePrice: 35000,
        depositRequired: 10000,
      },
    ])
  })

  it('sin citas devuelve una lista vacía, no un error', async () => {
    const { db } = createFakeDb({ data: [], error: null })
    const result = await createSupabaseMyAppointmentsRepository(db).listUpcoming(NOW_MS)

    expect(isOk(result) && result.value).toEqual([])
  })

  it('un fallo de la base es StorageFailed, nunca «sin citas»', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'connection refused' } })
    const result = await createSupabaseMyAppointmentsRepository(db).listUpcoming(NOW_MS)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
