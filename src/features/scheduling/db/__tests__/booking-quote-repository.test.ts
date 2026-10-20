import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseBookingQuoteRepository } from '../booking-quote-repository'
import { QUOTE_BOOKING_FUNCTION } from '../booking-quote-repository.constants'
import { BOOKING_ERROR_MESSAGES } from '../booking-repository.constants'

const TECHNIQUE_ID = 'tecnica-clasicas'
const input = { techniqueId: TECHNIQUE_ID, isFirstTime: true }
const row = {
  technique_name: 'Clásicas',
  price: 35000,
  duration_min: 60,
  buffer_min: 15,
  deposit_due: 10000,
}

type FakeResponse = { data: Array<typeof row> | null; error: { code?: string; message: string } | null }

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

async function quoteExpectingError(response: FakeResponse) {
  const { db } = createFakeDb(response)
  const result = await createSupabaseBookingQuoteRepository(db).quote(input)
  expect(isErr(result)).toBe(true)
  return isErr(result) ? result.error : null
}

describe('createSupabaseBookingQuoteRepository', () => {
  it('llama a la función SQL solo con técnica y primera vez, y devuelve la cotización', async () => {
    const { db, calls } = createFakeDb({ data: [row], error: null })
    const result = await createSupabaseBookingQuoteRepository(db).quote(input)

    expect(calls).toEqual([
      { functionName: QUOTE_BOOKING_FUNCTION, args: { p_technique_id: TECHNIQUE_ID, p_is_first_time: true } },
    ])
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual({
        techniqueName: 'Clásicas',
        servicePrice: 35000,
        durationMin: 60,
        bufferMin: 15,
        depositDue: 10000,
      })
    }
  })

  it.each([
    [BOOKING_ERROR_MESSAGES.clientNotRegistered, { code: 'SCHEDULING_CLIENT_NOT_REGISTERED' }],
    [
      BOOKING_ERROR_MESSAGES.techniqueNotAvailable,
      { code: 'SCHEDULING_TECHNIQUE_NOT_AVAILABLE', techniqueId: TECHNIQUE_ID },
    ],
    ['connection refused', { code: 'SCHEDULING_STORAGE_FAILED' }],
  ])('el mensaje %s de la base llega como su error tipado, sin lanzar', async (message, expectedError) => {
    const error = await quoteExpectingError({ data: null, error: { code: 'P0001', message } })
    expect(error).toMatchObject(expectedError)
  })

  it('sin filas → StorageFailed', async () => {
    const error = await quoteExpectingError({ data: [], error: null })
    expect(error).toMatchObject({ code: 'SCHEDULING_STORAGE_FAILED' })
  })
})
