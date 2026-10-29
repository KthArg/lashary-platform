import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabasePackageBookingRepository } from '../package-booking-repository'
import { OVERLAP_REJECTED_EVENT } from '../appointment-repository.constants'
import type { BookingOverlapEvent } from '../booking-repository'
import {
  BOOK_PACKAGE_APPOINTMENT_FUNCTION,
  PACKAGE_BOOKING_ERROR_MESSAGES,
} from '../package-booking-repository.constants'

const RESOURCE_ID = 'recurso-estudio'
const PACKAGE_ID = 'paquete-combo'
const STARTS_AT_MS = Date.parse('2027-09-06T15:00:00Z')
const input = {
  resourceId: RESOURCE_ID,
  startsAtMs: STARTS_AT_MS,
  packageId: PACKAGE_ID,
}
const row = {
  id: 'cita-1',
  resource_id: RESOURCE_ID,
  starts_at: '2027-09-06T15:00:00+00:00',
  ends_at: '2027-09-06T16:30:00+00:00',
  package_name: 'Combo clásicas',
  service_price: 45000,
  deposit_required: 12000,
  deposit_registered: 0,
}

type FakeResponse = { data: typeof row | null; error: { code?: string; message: string } | null }

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

async function bookExpectingError(message: string) {
  const { db } = createFakeDb({ data: null, error: { code: 'P0001', message } })
  const result = await createSupabasePackageBookingRepository(db).book(input)
  expect(isErr(result)).toBe(true)
  return isErr(result) ? result.error : null
}

describe('createSupabasePackageBookingRepository', () => {
  it('llama a la función SQL solo con recurso, hora y paquete, y devuelve la cita en milisegundos', async () => {
    const { db, calls } = createFakeDb({ data: row, error: null })
    const result = await createSupabasePackageBookingRepository(db).book(input)

    expect(calls).toEqual([
      {
        functionName: BOOK_PACKAGE_APPOINTMENT_FUNCTION,
        args: {
          p_resource_id: RESOURCE_ID,
          p_starts_at: '2027-09-06T15:00:00.000Z',
          p_package_id: PACKAGE_ID,
        },
      },
    ])
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual({
        id: 'cita-1',
        resourceId: RESOURCE_ID,
        startsAtMs: STARTS_AT_MS,
        endsAtMs: Date.parse('2027-09-06T16:30:00Z'),
        packageName: 'Combo clásicas',
        servicePrice: 45000,
        depositRequired: 12000,
        depositRegistered: 0,
      })
    }
  })

  it.each([
    [PACKAGE_BOOKING_ERROR_MESSAGES.slotTaken, { code: 'SCHEDULING_SPACE_NOT_AVAILABLE', resourceId: RESOURCE_ID }],
    [PACKAGE_BOOKING_ERROR_MESSAGES.slotNotOffered, { code: 'SCHEDULING_SLOT_NOT_OFFERED', resourceId: RESOURCE_ID }],
    [
      PACKAGE_BOOKING_ERROR_MESSAGES.packageNotAvailable,
      { code: 'SCHEDULING_PACKAGE_NOT_AVAILABLE', packageId: PACKAGE_ID },
    ],
    [PACKAGE_BOOKING_ERROR_MESSAGES.clientNotRegistered, { code: 'SCHEDULING_CLIENT_NOT_REGISTERED' }],
    [PACKAGE_BOOKING_ERROR_MESSAGES.tooManyPending, { code: 'SCHEDULING_TOO_MANY_PENDING_APPOINTMENTS' }],
  ])('el mensaje %s de la base llega como su error tipado', async (message, expectedError) => {
    expect(await bookExpectingError(message)).toMatchObject(expectedError)
  })

  it('cualquier otro fallo de la base → StorageFailed, sin lanzar', async () => {
    expect(await bookExpectingError('connection refused')).toMatchObject({
      code: 'SCHEDULING_STORAGE_FAILED',
    })
  })

  it.each([
    ['sin fila', null],
    ['una fila vacía', { ...row, id: null }],
  ])(
    'si la función devuelve %s, el constraint rechazó la reserva: espacio no disponible y un evento estructurado',
    async (_name, data) => {
      const { db } = createFakeDb({ data: data as typeof row | null, error: null })
      const reported: BookingOverlapEvent[] = []
      const result = await createSupabasePackageBookingRepository(db, (event) => reported.push(event)).book(input)

      expect(isErr(result) && result.error).toMatchObject({ code: 'SCHEDULING_SPACE_NOT_AVAILABLE', resourceId: RESOURCE_ID })
      expect(reported).toEqual([{ event: OVERLAP_REJECTED_EVENT, resourceId: RESOURCE_ID, startsAtMs: STARTS_AT_MS }])
    },
  )

  it('una reserva normal no emite ningún evento', async () => {
    const { db } = createFakeDb({ data: row, error: null })
    const reported: BookingOverlapEvent[] = []
    await createSupabasePackageBookingRepository(db, (event) => reported.push(event)).book(input)
    expect(reported).toHaveLength(0)
  })
})
