import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabasePendingAppointmentsRepository } from '../pending-appointments-repository'
import { APPOINTMENTS_TABLE, PENDING_APPOINTMENT_COLUMNS } from '../appointment-repository.constants'

const baseRow = {
  id: 'cita-1',
  starts_at: '2027-03-01T16:00:00+00:00',
  ends_at: '2027-03-01T17:00:00+00:00',
}
const chosenRow = {
  ...baseRow,
  technique_name: 'Clásicas',
  is_first_time: false,
  is_first_time_detected: true,
  service_price: 25000,
  deposit_required: 10000,
}
const staffRow = {
  ...baseRow,
  technique_name: null,
  is_first_time: null,
  is_first_time_detected: null,
  service_price: null,
  deposit_required: null,
}

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: Array<[string, ...unknown[]]> = []
  const query = {
    select: (columns: string) => (calls.push(['select', columns]), query),
    eq: (column: string, value: unknown) => (calls.push(['eq', column, value]), query),
    order: async (column: string, options: unknown) => (calls.push(['order', column, options]), response),
  }
  const db = { from: (table: string) => (calls.push(['from', table]), query) } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabasePendingAppointmentsRepository', () => {
  it('pide la elección de la clienta junto con el horario, solo las pendientes y las más próximas primero', async () => {
    const { db, calls } = createFakeDb({ data: [chosenRow], error: null })
    const result = await createSupabasePendingAppointmentsRepository(db).listPending()

    expect(calls).toEqual([
      ['from', APPOINTMENTS_TABLE],
      ['select', PENDING_APPOINTMENT_COLUMNS],
      ['eq', 'status', 'pending_approval'],
      ['order', 'starts_at', { ascending: true }],
    ])
    expect(isOk(result) && result.value).toEqual([
      {
        id: 'cita-1',
        startsAtMs: Date.parse('2027-03-01T16:00:00Z'),
        endsAtMs: Date.parse('2027-03-01T17:00:00Z'),
        choice: {
          techniqueName: 'Clásicas',
          isFirstTime: false,
          detectedFirstTime: true,
          servicePrice: 25000,
          depositRequired: 10000,
        },
      },
    ])
  })

  it('una cita creada por el personal, sin elección guardada, llega con choice nulo', async () => {
    const { db } = createFakeDb({ data: [staffRow], error: null })
    const result = await createSupabasePendingAppointmentsRepository(db).listPending()

    expect(isOk(result) && result.value[0].choice).toBeNull()
  })

  it('un fallo de la base es StorageFailed', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'connection refused' } })
    const result = await createSupabasePendingAppointmentsRepository(db).listPending()

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
