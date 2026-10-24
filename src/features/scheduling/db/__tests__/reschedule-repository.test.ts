import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseRescheduleRepository } from '../reschedule-repository'
import { RESCHEDULE_APPOINTMENT_FUNCTION, RESCHEDULE_ERROR_MESSAGES } from '../reschedule-repository.constants'

const APPOINTMENT_ID = 'cita-1'
const NEW_STARTS_AT = '2027-09-27T15:00:00.000Z'
const NEW_ENDS_AT = '2027-09-27T16:00:00.000Z'
const input = {
  appointmentId: APPOINTMENT_ID,
  newStartsAtMs: Date.parse(NEW_STARTS_AT),
  expectedStatus: 'approved',
} as const
const rescheduleRow = {
  appointment_id: APPOINTMENT_ID,
  starts_at: NEW_STARTS_AT,
  ends_at: NEW_ENDS_AT,
  reschedule_count: 1,
}

type FakeResponse = { data: unknown[] | null; error: { code?: string; message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: Array<{ functionName: string; args: unknown }> = []
  const db = {
    rpc: async (functionName: string, args: unknown) => {
      calls.push({ functionName, args })
      return response
    },
  } as unknown as SupabaseClient
  return { db, calls }
}

const databaseErrors = [
  [RESCHEDULE_ERROR_MESSAGES.clientNotRegistered, { code: 'SCHEDULING_CLIENT_NOT_REGISTERED' }],
  [
    RESCHEDULE_ERROR_MESSAGES.appointmentNotReschedulable,
    { code: 'SCHEDULING_APPOINTMENT_NOT_RESCHEDULABLE', appointmentId: APPOINTMENT_ID },
  ],
  [
    RESCHEDULE_ERROR_MESSAGES.outsideWindow,
    { code: 'SCHEDULING_RESCHEDULE_OUTSIDE_WINDOW', appointmentId: APPOINTMENT_ID },
  ],
  [
    RESCHEDULE_ERROR_MESSAGES.limitReached,
    { code: 'SCHEDULING_RESCHEDULE_LIMIT_REACHED', appointmentId: APPOINTMENT_ID },
  ],
  [
    RESCHEDULE_ERROR_MESSAGES.stateChanged,
    { code: 'SCHEDULING_RESCHEDULE_STATE_CHANGED', appointmentId: APPOINTMENT_ID },
  ],
  [
    RESCHEDULE_ERROR_MESSAGES.slotNotOffered,
    { code: 'SCHEDULING_RESCHEDULE_SLOT_NOT_OFFERED', appointmentId: APPOINTMENT_ID },
  ],
  [
    RESCHEDULE_ERROR_MESSAGES.slotTaken,
    { code: 'SCHEDULING_RESCHEDULE_SLOT_TAKEN', appointmentId: APPOINTMENT_ID },
  ],
  [RESCHEDULE_ERROR_MESSAGES.tooManyPending, { code: 'SCHEDULING_TOO_MANY_PENDING_APPOINTMENTS' }],
  ['connection refused', { code: 'SCHEDULING_STORAGE_FAILED' }],
] as const

describe('createSupabaseRescheduleRepository', () => {
  it('llama a la función SQL con la cita, el horario nuevo y el estado que vio la clienta', async () => {
    const { db, calls } = createFakeDb({ data: [rescheduleRow], error: null })
    await createSupabaseRescheduleRepository(db).reschedule(input)

    expect(calls).toEqual([
      {
        functionName: RESCHEDULE_APPOINTMENT_FUNCTION,
        args: {
          p_appointment_id: APPOINTMENT_ID,
          p_new_starts_at: NEW_STARTS_AT,
          p_expected_status: 'approved',
        },
      },
    ])
  })

  it('devuelve la cita movida con sus horarios en milisegundos y el contador', async () => {
    const { db } = createFakeDb({ data: [rescheduleRow], error: null })
    const result = await createSupabaseRescheduleRepository(db).reschedule(input)

    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual({
        appointmentId: APPOINTMENT_ID,
        startsAtMs: Date.parse(NEW_STARTS_AT),
        endsAtMs: Date.parse(NEW_ENDS_AT),
        rescheduleCount: 1,
      })
    }
  })

  it.each(databaseErrors)(
    'el mensaje %s de la base llega como su error tipado, sin lanzar',
    async (message, expectedError) => {
      const { db } = createFakeDb({ data: null, error: { code: 'P0001', message } })
      const result = await createSupabaseRescheduleRepository(db).reschedule(input)

      expect(isErr(result)).toBe(true)
      if (isErr(result)) expect(result.error).toMatchObject(expectedError)
    },
  )

  it('sin filas → StorageFailed', async () => {
    const { db } = createFakeDb({ data: [], error: null })
    const result = await createSupabaseRescheduleRepository(db).reschedule(input)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
