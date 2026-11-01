import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { appointmentNotReschedulable, rescheduleLimitReached } from '../../domain/errors'
import { quoteReschedule, rescheduleAppointment } from '../reschedule-appointment'
import type { RescheduledAppointment, RescheduleInput, RescheduleQuote, RescheduleRepository } from '../ports'

const APPOINTMENT_ID = 'cita-1'
const ONE_HOUR_MS = 60 * 60 * 1000
const input: RescheduleInput = {
  appointmentId: APPOINTMENT_ID,
  newStartsAtMs: Date.parse('2027-09-27T15:00:00Z'),
  expectedStatus: 'approved',
}
const rescheduled: RescheduledAppointment = {
  appointmentId: APPOINTMENT_ID,
  startsAtMs: input.newStartsAtMs,
  endsAtMs: input.newStartsAtMs + ONE_HOUR_MS,
  rescheduleCount: 1,
}

const quote: RescheduleQuote = {
  startsAtMs: Date.parse('2027-09-06T15:00:00Z'),
  endsAtMs: Date.parse('2027-09-06T16:00:00Z'),
  occupiedMinutes: 75,
  techniqueName: 'Clásicas',
  status: 'approved',
  rescheduleCount: 0,
  maxReschedules: 1,
  windowHours: 48,
  blockedBy: null,
}

function createFakeRepository(overrides: Partial<RescheduleRepository> = {}) {
  const requested: RescheduleInput[] = []
  const quoted: string[] = []
  const repository: RescheduleRepository = {
    quote: async (appointmentId) => {
      quoted.push(appointmentId)
      return ok(quote)
    },
    reschedule: async (requestedInput) => {
      requested.push(requestedInput)
      return ok(rescheduled)
    },
    ...overrides,
  }
  return { repository, requested, quoted }
}

describe('rescheduleAppointment', () => {
  it('pasa al repositorio la cita, el horario nuevo y el estado que vio la clienta', async () => {
    const { repository, requested } = createFakeRepository()
    const result = await rescheduleAppointment(repository)(input)

    expect(isOk(result) && result.value).toEqual(rescheduled)
    expect(requested).toEqual([input])
  })

  it('devuelve el error tipado del repositorio, sin lanzar', async () => {
    const { repository } = createFakeRepository({
      reschedule: async () => err(rescheduleLimitReached(APPOINTMENT_ID)),
    })
    const result = await rescheduleAppointment(repository)(input)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_RESCHEDULE_LIMIT_REACHED')
  })
})

describe('quoteReschedule', () => {
  it('pide al repositorio lo que se puede hacer con esa cita, sin moverla', async () => {
    const { repository, requested, quoted } = createFakeRepository()
    const result = await quoteReschedule(repository)(APPOINTMENT_ID)

    expect(isOk(result) && result.value).toEqual(quote)
    expect(quoted).toEqual([APPOINTMENT_ID])
    expect(requested).toEqual([])
  })

  it('devuelve el error tipado del repositorio, sin lanzar', async () => {
    const { repository } = createFakeRepository({
      quote: async () => err(appointmentNotReschedulable(APPOINTMENT_ID)),
    })
    const result = await quoteReschedule(repository)(APPOINTMENT_ID)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_APPOINTMENT_NOT_RESCHEDULABLE')
  })
})
