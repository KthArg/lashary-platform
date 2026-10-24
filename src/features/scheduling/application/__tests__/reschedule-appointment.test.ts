import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { rescheduleLimitReached } from '../../domain/errors'
import { rescheduleAppointment } from '../reschedule-appointment'
import type { RescheduledAppointment, RescheduleInput, RescheduleRepository } from '../ports'

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

function createFakeRepository(overrides: Partial<RescheduleRepository> = {}) {
  const requested: RescheduleInput[] = []
  const repository: RescheduleRepository = {
    reschedule: async (requestedInput) => {
      requested.push(requestedInput)
      return ok(rescheduled)
    },
    ...overrides,
  }
  return { repository, requested }
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
