import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { slotNotOffered, spaceNotAvailable } from '../../domain/errors'
import { MS_PER_MINUTE } from '../../domain/appointment-window.constants'
import { bookPackageAppointment } from '../book-package-appointment'
import { noDelinquencyYet } from '../no-delinquency'
import type {
  BookPackageAppointmentInput,
  BookedPackageAppointment,
  DelinquencyPort,
  PackageBookingRepository,
} from '../ports'

const RESOURCE_ID = 'recurso-estudio'
const STARTS_AT_MS = Date.parse('2027-09-06T15:00:00Z')
const TOTAL_DURATION_MIN = 90
const input: BookPackageAppointmentInput = {
  resourceId: RESOURCE_ID,
  startsAtMs: STARTS_AT_MS,
  packageId: 'paquete-combo',
}
const booked: BookedPackageAppointment = {
  id: 'cita-1',
  resourceId: RESOURCE_ID,
  startsAtMs: STARTS_AT_MS,
  endsAtMs: STARTS_AT_MS + TOTAL_DURATION_MIN * MS_PER_MINUTE,
  packageName: 'Combo clásicas',
  servicePrice: 45000,
  depositRequired: 12000,
  depositRegistered: 0,
}

function createFakePackageBookingRepository(
  result: Awaited<ReturnType<PackageBookingRepository['book']>>,
) {
  const received: BookPackageAppointmentInput[] = []
  const repository: PackageBookingRepository = {
    async book(bookingInput) {
      received.push(bookingInput)
      return result
    },
  }
  return { repository, received }
}

const withDelinquency: DelinquencyPort = { hasActiveDelinquency: async () => true }

describe('bookPackageAppointment', () => {
  it('entrega al repositorio lo que pidió la clienta y devuelve la cita de paquete reservada', async () => {
    const { repository, received } = createFakePackageBookingRepository(ok(booked))
    const result = await bookPackageAppointment({ bookings: repository, delinquency: noDelinquencyYet })(input)

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual(booked)
    expect(received).toEqual([input])
  })

  it('una clienta con morosidad activa no llega a reservar el paquete', async () => {
    const { repository, received } = createFakePackageBookingRepository(ok(booked))
    const result = await bookPackageAppointment({ bookings: repository, delinquency: withDelinquency })(input)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_CLIENT_HAS_ACTIVE_DELINQUENCY')
    expect(received).toHaveLength(0)
  })

  it('el espacio ocupado llega como valor, no como excepción', async () => {
    const { repository } = createFakePackageBookingRepository(err(spaceNotAvailable(RESOURCE_ID)))
    const result = await bookPackageAppointment({ bookings: repository, delinquency: noDelinquencyYet })(input)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_SPACE_NOT_AVAILABLE')
  })

  it('un horario que el calendario no ofrece también llega como valor', async () => {
    const { repository } = createFakePackageBookingRepository(err(slotNotOffered(RESOURCE_ID)))
    const result = await bookPackageAppointment({ bookings: repository, delinquency: noDelinquencyYet })(input)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_SLOT_NOT_OFFERED')
  })
})
