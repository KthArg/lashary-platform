import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { slotNotOffered, spaceNotAvailable } from '../../domain/errors'
import { MS_PER_MINUTE } from '../../domain/appointment-window.constants'
import { bookAppointment } from '../book-appointment'
import { noDelinquencyYet } from '../no-delinquency'
import type {
  BookAppointmentInput,
  BookedAppointment,
  BookingRepository,
  DelinquencyPort,
} from '../ports'

const RESOURCE_ID = 'recurso-estudio'
const STARTS_AT_MS = Date.parse('2027-09-06T15:00:00Z')
const SERVICE_DURATION_MIN = 60
const input: BookAppointmentInput = {
  resourceId: RESOURCE_ID,
  startsAtMs: STARTS_AT_MS,
  techniqueId: 'tecnica-clasicas',
  isFirstTime: true,
}
const booked: BookedAppointment = {
  id: 'cita-1',
  resourceId: RESOURCE_ID,
  startsAtMs: STARTS_AT_MS,
  endsAtMs: STARTS_AT_MS + SERVICE_DURATION_MIN * MS_PER_MINUTE,
  techniqueName: 'Clásicas',
  servicePrice: 35000,
  depositRequired: 10000,
  depositRegistered: 0,
  isFirstTime: true,
}

function createFakeBookingRepository(result: Awaited<ReturnType<BookingRepository['book']>>) {
  const received: BookAppointmentInput[] = []
  const repository: BookingRepository = {
    async book(bookingInput) {
      received.push(bookingInput)
      return result
    },
  }
  return { repository, received }
}

const withDelinquency: DelinquencyPort = { hasActiveDelinquency: async () => true }

describe('bookAppointment', () => {
  it('entrega al repositorio lo que pidió la clienta y devuelve la cita reservada', async () => {
    const { repository, received } = createFakeBookingRepository(ok(booked))
    const result = await bookAppointment({ bookings: repository, delinquency: noDelinquencyYet })(input)

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual(booked)
    expect(received).toEqual([input])
  })

  it('una clienta con morosidad activa no llega a reservar', async () => {
    const { repository, received } = createFakeBookingRepository(ok(booked))
    const result = await bookAppointment({ bookings: repository, delinquency: withDelinquency })(input)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_CLIENT_HAS_ACTIVE_DELINQUENCY')
    expect(received).toHaveLength(0)
  })

  it('el espacio ocupado llega como valor, no como excepción', async () => {
    const { repository } = createFakeBookingRepository(err(spaceNotAvailable(RESOURCE_ID)))
    const result = await bookAppointment({ bookings: repository, delinquency: noDelinquencyYet })(input)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_SPACE_NOT_AVAILABLE')
  })

  it('un horario que el calendario no ofrece también llega como valor', async () => {
    const { repository } = createFakeBookingRepository(err(slotNotOffered(RESOURCE_ID)))
    const result = await bookAppointment({ bookings: repository, delinquency: noDelinquencyYet })(input)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_SLOT_NOT_OFFERED')
  })

  it('mientras no exista la morosidad (US-MOR-02), nadie queda bloqueada', async () => {
    expect(await noDelinquencyYet.hasActiveDelinquency()).toBe(false)
  })
})
