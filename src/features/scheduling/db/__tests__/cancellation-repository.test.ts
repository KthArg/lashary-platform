import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseCancellationRepository } from '../cancellation-repository'
import {
  CANCEL_APPOINTMENT_FUNCTION,
  CANCELLATION_ERROR_MESSAGES,
  QUOTE_CANCELLATION_FUNCTION,
} from '../cancellation-repository.constants'

const APPOINTMENT_ID = 'cita-1'
const STARTS_AT = '2027-09-10T15:00:00+00:00'
const quoteRow = {
  starts_at: STARTS_AT,
  technique_name: 'Clásicas',
  within_window: false,
  forfeited_deposit: 10000,
  window_hours: 48,
}
const cancelRow = { appointment_id: APPOINTMENT_ID, within_window: false, forfeited_deposit: 10000 }

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
  [CANCELLATION_ERROR_MESSAGES.clientNotRegistered, { code: 'SCHEDULING_CLIENT_NOT_REGISTERED' }],
  [
    CANCELLATION_ERROR_MESSAGES.appointmentNotCancellable,
    { code: 'SCHEDULING_APPOINTMENT_NOT_CANCELLABLE', appointmentId: APPOINTMENT_ID },
  ],
  ['connection refused', { code: 'SCHEDULING_STORAGE_FAILED' }],
] as const

describe('createSupabaseCancellationRepository', () => {
  describe('quote', () => {
    it('llama a la función SQL solo con la cita y devuelve lo que pasaría', async () => {
      const { db, calls } = createFakeDb({ data: [quoteRow], error: null })
      const result = await createSupabaseCancellationRepository(db).quote(APPOINTMENT_ID)

      expect(calls).toEqual([
        { functionName: QUOTE_CANCELLATION_FUNCTION, args: { p_appointment_id: APPOINTMENT_ID } },
      ])
      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toEqual({
          startsAtMs: Date.parse(STARTS_AT),
          techniqueName: 'Clásicas',
          withinWindow: false,
          windowHours: 48,
          forfeitedDeposit: 10000,
        })
      }
    })

    it.each(databaseErrors)(
      'el mensaje %s de la base llega como su error tipado, sin lanzar',
      async (message, expectedError) => {
        const { db } = createFakeDb({ data: null, error: { code: 'P0001', message } })
        const result = await createSupabaseCancellationRepository(db).quote(APPOINTMENT_ID)
        expect(isErr(result)).toBe(true)
        if (isErr(result)) expect(result.error).toMatchObject(expectedError)
      },
    )

    it('sin filas → StorageFailed', async () => {
      const { db } = createFakeDb({ data: [], error: null })
      const result = await createSupabaseCancellationRepository(db).quote(APPOINTMENT_ID)
      expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
    })
  })

  describe('cancel', () => {
    it('llama a la función SQL solo con la cita, nunca con la clienta, y devuelve la consecuencia', async () => {
      const { db, calls } = createFakeDb({ data: [cancelRow], error: null })
      const result = await createSupabaseCancellationRepository(db).cancel(APPOINTMENT_ID)

      expect(calls).toEqual([
        { functionName: CANCEL_APPOINTMENT_FUNCTION, args: { p_appointment_id: APPOINTMENT_ID } },
      ])
      expect(isOk(result)).toBe(true)
      if (isOk(result)) {
        expect(result.value).toEqual({
          appointmentId: APPOINTMENT_ID,
          withinWindow: false,
          forfeitedDeposit: 10000,
        })
      }
    })

    it.each(databaseErrors)(
      'el mensaje %s de la base llega como su error tipado, sin lanzar',
      async (message, expectedError) => {
        const { db } = createFakeDb({ data: null, error: { code: 'P0001', message } })
        const result = await createSupabaseCancellationRepository(db).cancel(APPOINTMENT_ID)
        expect(isErr(result)).toBe(true)
        if (isErr(result)) expect(result.error).toMatchObject(expectedError)
      },
    )

    it('sin filas → StorageFailed', async () => {
      const { db } = createFakeDb({ data: [], error: null })
      const result = await createSupabaseCancellationRepository(db).cancel(APPOINTMENT_ID)
      expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
    })
  })
})
