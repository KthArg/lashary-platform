import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseMyAppointmentsRepository } from '../my-appointments-repository'
import { LIST_MY_APPOINTMENTS_FUNCTION, MY_APPOINTMENTS_LIMIT } from '../my-appointments-repository.constants'

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
  held_starts_at: null,
  held_ends_at: null,
}

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: Array<{ functionName: string; args: unknown }> = []
  const db = {
    rpc: async (functionName: string, args: unknown) => (calls.push({ functionName, args }), response),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabaseMyAppointmentsRepository', () => {
  it('llama a la función SQL con la hora y el tope, nunca con la clienta, y devuelve sus citas', async () => {
    const { db, calls } = createFakeDb({ data: [row], error: null })
    const result = await createSupabaseMyAppointmentsRepository(db).listUpcoming(NOW_MS)

    expect(calls).toEqual([
      {
        functionName: LIST_MY_APPOINTMENTS_FUNCTION,
        args: { p_now: '2027-09-01T12:00:00.000Z', p_limit: MY_APPOINTMENTS_LIMIT },
      },
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
        heldSchedule: null,
      },
    ])
  })

  it('una cita reagendada trae el horario aprobado que guarda mientras se decide', async () => {
    const heldRow = {
      ...row,
      status: 'pending_approval',
      held_starts_at: '2027-09-03T15:00:00+00:00',
      held_ends_at: '2027-09-03T16:00:00+00:00',
    }
    const { db } = createFakeDb({ data: [heldRow], error: null })
    const result = await createSupabaseMyAppointmentsRepository(db).listUpcoming(NOW_MS)

    expect(isOk(result) && result.value[0].heldSchedule).toEqual({
      startsAtMs: Date.parse('2027-09-03T15:00:00Z'),
      endsAtMs: Date.parse('2027-09-03T16:00:00Z'),
    })
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
