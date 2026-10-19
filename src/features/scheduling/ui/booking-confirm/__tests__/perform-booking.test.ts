import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { Money } from '@/shared/money'
import {
  clientHasActiveDelinquency,
  clientNotRegistered,
  slotNotOffered,
  spaceNotAvailable,
  storageFailed,
  techniqueNotAvailable,
} from '../../../domain/errors'
import { MS_PER_MINUTE } from '../../../domain/appointment-window.constants'
import { bookingConfirmMessages } from '../constants/booking-confirm-strings'
import { performBooking, type PerformBookingDeps } from '../utils/perform-booking'
import type { BookAppointmentInput, BookedAppointment } from '../../../application/ports'

const RESOURCE_ID = 'recurso-estudio'
const NOW = new Date('2026-10-19T15:00:00Z')
const TECHNIQUE = {
  id: 't1',
  name: 'Clásicas',
  isActive: true,
  durationFirstTimeMin: 60,
  durationRetouchMin: 45,
  bufferMin: 15,
}
const SERVICE_DURATION_MIN = 60
const STARTS_AT_MS = Date.parse('2027-03-01T16:00:00Z')
const BOOKED: BookedAppointment = {
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
const fields = { servicio: 't1', fecha: '2027-03-01', espacio: '600' }

function createDeps(overrides: Partial<PerformBookingDeps> = {}) {
  const booked: BookAppointmentInput[] = []
  const deps: PerformBookingDeps = {
    resourceId: RESOURCE_ID,
    isClient: async () => true,
    listTechniques: async () => [TECHNIQUE],
    book: async (input) => {
      booked.push(input)
      return ok(BOOKED)
    },
    clock: () => NOW,
    ...overrides,
  }
  return { deps, booked }
}

describe('performBooking — US-AGE-05', () => {
  it.each([
    ['primera vez', 't1', true],
    ['retoque', 't1.retoque', false],
  ])('%s: reserva con el instante de la hora del estudio y la técnica elegida, sin ningún monto de la clienta', async (_name, servicio, isFirstTime) => {
    const { deps, booked } = createDeps()
    await performBooking({ ...fields, servicio }, deps)

    expect(booked).toEqual([{ resourceId: RESOURCE_ID, startsAtMs: STARTS_AT_MS, techniqueId: 't1', isFirstTime }])
  })

  it('al reservar, devuelve el detalle de la cita para la confirmación visual (criterio 5)', async () => {
    const { deps } = createDeps()
    const outcome = await performBooking(fields, deps)

    expect(outcome).toMatchObject({
      kind: 'booked',
      booked: {
        status: bookingConfirmMessages.pendingApproval,
        summary: {
          service: 'Clásicas — primera vez',
          duration: '60 min',
          price: Money.fromColones(BOOKED.servicePrice).toString(),
          deposit: Money.fromColones(BOOKED.depositRequired).toString(),
        },
      },
    })
    if (outcome.kind === 'booked') expect(outcome.booked.summary.when).toContain('10:00–11:00')
  })

  it.each([
    ['espacio tomado', spaceNotAvailable(RESOURCE_ID), 'ocupado'],
    ['horario que no se ofrece', slotNotOffered(RESOURCE_ID), 'no-ofrecido'],
  ])('%s: vuelve al calendario con el mismo servicio y día, y un aviso (criterio 4)', async (_name, error, notice) => {
    const { deps } = createDeps({ book: async () => err(error) })
    const outcome = await performBooking(fields, deps)

    expect(outcome).toEqual({
      kind: 'retry',
      backHref: `/portal/citas/calendario?servicio=t1&fecha=2027-03-01&aviso=${notice}`,
    })
  })

  it.each([
    ['clienta sin perfil', clientNotRegistered(), bookingConfirmMessages.clientNotRegistered],
    ['morosidad activa', clientHasActiveDelinquency(), bookingConfirmMessages.delinquency],
    ['servicio que ya no está', techniqueNotAvailable('t1'), bookingConfirmMessages.unavailable],
    ['fallo de la base', storageFailed('sin conexión'), bookingConfirmMessages.storageFailed],
  ])('%s: avisa sin salir de la pantalla', async (_name, error, message) => {
    const { deps } = createDeps({ book: async () => err(error) })
    expect(await performBooking(fields, deps)).toEqual({ kind: 'failed', message })
  })

  it('quien no es clienta no reserva', async () => {
    const { deps, booked } = createDeps({ isClient: async () => false })
    expect(await performBooking(fields, deps)).toEqual({ kind: 'failed', message: bookingConfirmMessages.accessDenied })
    expect(booked).toHaveLength(0)
  })

  it.each([
    ['parámetros inválidos', { ...fields, espacio: 'abc' }, '/portal/citas/calendario?aviso=no-ofrecido'],
    ['servicio que ya no existe', { ...fields, servicio: 'otro' }, '/portal/citas/calendario?servicio=otro&fecha=2027-03-01&aviso=no-ofrecido'],
  ])('%s: vuelve al calendario sin reservar', async (_name, input, backHref) => {
    const { deps, booked } = createDeps()
    expect(await performBooking(input, deps)).toEqual({ kind: 'retry', backHref })
    expect(booked).toHaveLength(0)
  })
})
