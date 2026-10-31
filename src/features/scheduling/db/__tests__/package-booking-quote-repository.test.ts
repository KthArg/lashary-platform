import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabasePackageBookingQuoteRepository } from '../package-booking-quote-repository'
import { QUOTE_PACKAGE_BOOKING_FUNCTION } from '../package-booking-quote-repository.constants'
import { PACKAGE_BOOKING_ERROR_MESSAGES } from '../package-booking-repository.constants'

const PACKAGE_ID = 'paquete-combo'
const input = { packageId: PACKAGE_ID }
const row = {
  package_name: 'Combo clásicas',
  price: 45000,
  duration_min: 90,
  buffer_min: 20,
  deposit_due: 12000,
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
  const result = await createSupabasePackageBookingQuoteRepository(db).quote(input)
  expect(isErr(result)).toBe(true)
  return isErr(result) ? result.error : null
}

describe('createSupabasePackageBookingQuoteRepository', () => {
  it('llama a la función SQL solo con el paquete, y devuelve la cotización', async () => {
    const { db, calls } = createFakeDb({ data: [row], error: null })
    const result = await createSupabasePackageBookingQuoteRepository(db).quote(input)

    expect(calls).toEqual([
      { functionName: QUOTE_PACKAGE_BOOKING_FUNCTION, args: { p_package_id: PACKAGE_ID } },
    ])
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual({
        packageName: 'Combo clásicas',
        servicePrice: 45000,
        durationMin: 90,
        bufferMin: 20,
        depositDue: 12000,
      })
    }
  })

  it.each([
    [PACKAGE_BOOKING_ERROR_MESSAGES.clientNotRegistered, { code: 'SCHEDULING_CLIENT_NOT_REGISTERED' }],
    [
      PACKAGE_BOOKING_ERROR_MESSAGES.packageNotAvailable,
      { code: 'SCHEDULING_PACKAGE_NOT_AVAILABLE', packageId: PACKAGE_ID },
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
