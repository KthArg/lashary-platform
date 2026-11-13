import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { slotNotOffered, spaceNotAvailable, storageFailed } from '../../domain/errors'
import { MS_PER_MINUTE } from '../../domain/appointment-window.constants'
import { bookAppointment } from '../book-appointment'
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
  promotionId: null,
  discountPercent: null,
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

const notBlocked: DelinquencyPort = { activeBlock: async () => ok(null) }
const BLOCK = { appointmentId: 'cita-con-deuda', pending: 25000, appointmentStartsAtMs: Date.parse('2026-11-05T15:00:00Z') }
const blocked: DelinquencyPort = { activeBlock: async () => ok(BLOCK) }

describe('bookAppointment', () => {
  it('entrega al repositorio lo que pidió la clienta y devuelve la cita reservada', async () => {
    const { repository, received } = createFakeBookingRepository(ok(booked))
    const result = await bookAppointment({ bookings: repository, delinquency: notBlocked })(input)

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual(booked)
    expect(received).toEqual([input])
  })

  it('si la base rechaza por morosidad, dice cuánto debe, de qué cita y cuándo fue', async () => {
    const { repository, received } = createFakeBookingRepository(err(spaceNotAvailable(RESOURCE_ID)))
    const result = await bookAppointment({ bookings: repository, delinquency: blocked })(input)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error).toMatchObject({ code: 'SCHEDULING_CLIENT_HAS_ACTIVE_DELINQUENCY', ...BLOCK })
    expect(received).toEqual([input])
  })

  it('si la base rechaza el espacio y la clienta no está bloqueada, queda el espacio ocupado', async () => {
    const { repository } = createFakeBookingRepository(err(spaceNotAvailable(RESOURCE_ID)))
    const result = await bookAppointment({ bookings: repository, delinquency: notBlocked })(input)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_SPACE_NOT_AVAILABLE')
  })

  it('si no se puede preguntar por el bloqueo, queda el rechazo original', async () => {
    const { repository } = createFakeBookingRepository(err(spaceNotAvailable(RESOURCE_ID)))
    const failing: DelinquencyPort = { activeBlock: async () => err(storageFailed('caída')) }
    const result = await bookAppointment({ bookings: repository, delinquency: failing })(input)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_SPACE_NOT_AVAILABLE')
  })

  it('un rechazo que no es el espacio ocupado no pregunta por morosidad', async () => {
    const { repository } = createFakeBookingRepository(err(slotNotOffered(RESOURCE_ID)))
    let asked = false
    const spy: DelinquencyPort = {
      activeBlock: async () => {
        asked = true
        return ok(BLOCK)
      },
    }
    const result = await bookAppointment({ bookings: repository, delinquency: spy })(input)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_SLOT_NOT_OFFERED')
    expect(asked).toBe(false)
  })

  it('una reserva que sale bien no pregunta por morosidad', async () => {
    const { repository } = createFakeBookingRepository(ok(booked))
    let asked = false
    const spy: DelinquencyPort = {
      activeBlock: async () => {
        asked = true
        return ok(null)
      },
    }
    const result = await bookAppointment({ bookings: repository, delinquency: spy })(input)

    expect(isOk(result)).toBe(true)
    expect(asked).toBe(false)
  })

  it('el espacio ocupado llega como valor, no como excepción', async () => {
    const { repository } = createFakeBookingRepository(err(spaceNotAvailable(RESOURCE_ID)))
    const result = await bookAppointment({ bookings: repository, delinquency: notBlocked })(input)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_SPACE_NOT_AVAILABLE')
  })

  it('un horario que el calendario no ofrece también llega como valor', async () => {
    const { repository } = createFakeBookingRepository(err(slotNotOffered(RESOURCE_ID)))
    const result = await bookAppointment({ bookings: repository, delinquency: notBlocked })(input)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_SLOT_NOT_OFFERED')
  })

})
