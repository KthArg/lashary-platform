import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { appointmentNotCancellable } from '../../domain/errors'
import { cancelAppointment, quoteCancellation } from '../cancel-appointment'
import type { CancellationQuote, CancellationRepository, CancelledAppointment } from '../ports'

const APPOINTMENT_ID = 'cita-1'
const quote: CancellationQuote = {
  startsAtMs: Date.parse('2027-09-10T15:00:00Z'),
  techniqueName: 'Clásicas',
  withinWindow: false,
  windowHours: 48,
  forfeitedDeposit: 10000,
}
const cancelled: CancelledAppointment = {
  appointmentId: APPOINTMENT_ID,
  withinWindow: false,
  forfeitedDeposit: 10000,
}

function createFakeRepository(overrides: Partial<CancellationRepository> = {}) {
  const requested: string[] = []
  const repository: CancellationRepository = {
    quote: async (appointmentId) => {
      requested.push(`quote:${appointmentId}`)
      return ok(quote)
    },
    cancel: async (appointmentId) => {
      requested.push(`cancel:${appointmentId}`)
      return ok(cancelled)
    },
    ...overrides,
  }
  return { repository, requested }
}

describe('quoteCancellation', () => {
  it('pide la consecuencia de cancelar esa cita sin cancelarla (criterio 2)', async () => {
    const { repository, requested } = createFakeRepository()
    const result = await quoteCancellation(repository)(APPOINTMENT_ID)

    expect(isOk(result) && result.value).toEqual(quote)
    expect(requested).toEqual([`quote:${APPOINTMENT_ID}`])
  })

  it('devuelve el error tipado del repositorio, sin lanzar', async () => {
    const { repository } = createFakeRepository({
      quote: async () => err(appointmentNotCancellable(APPOINTMENT_ID)),
    })
    const result = await quoteCancellation(repository)(APPOINTMENT_ID)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_APPOINTMENT_NOT_CANCELLABLE')
  })
})

describe('cancelAppointment', () => {
  it('cancela esa cita y devuelve la consecuencia registrada', async () => {
    const { repository, requested } = createFakeRepository()
    const result = await cancelAppointment(repository)(APPOINTMENT_ID)

    expect(isOk(result) && result.value).toEqual(cancelled)
    expect(requested).toEqual([`cancel:${APPOINTMENT_ID}`])
  })

  it('devuelve el error tipado del repositorio, sin lanzar', async () => {
    const { repository } = createFakeRepository({
      cancel: async () => err(appointmentNotCancellable(APPOINTMENT_ID)),
    })
    const result = await cancelAppointment(repository)(APPOINTMENT_ID)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_APPOINTMENT_NOT_CANCELLABLE')
  })
})
