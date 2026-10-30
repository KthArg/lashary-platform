import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import {
  appointmentNotReschedulable,
  clientNotRegistered,
  rescheduleLimitReached,
  rescheduleOutsideWindow,
  rescheduleSlotNotOffered,
  rescheduleSlotTaken,
  rescheduleStateChanged,
  storageFailed,
  tooManyPendingAppointments,
} from '../../../domain/errors'
import type { RescheduleInput } from '../../../application/ports'
import { rescheduleMessages } from '../constants/reschedule-strings'
import { performRescheduleAppointment, type RescheduleDeps } from '../utils/perform-reschedule'

const APPOINTMENT_ID = '00000000-0000-4000-8000-00000000ea01'
const NEW_STARTS_AT_MS = Date.parse('2027-09-27T15:00:00Z')
const ONE_HOUR_MS = 60 * 60 * 1000
const request = { appointmentId: APPOINTMENT_ID, newStartsAtMs: NEW_STARTS_AT_MS, expectedStatus: 'approved' }

function createDeps(overrides: Partial<RescheduleDeps> = {}) {
  const requested: RescheduleInput[] = []
  const deps: RescheduleDeps = {
    isClient: async () => true,
    reschedule: async (input) => {
      requested.push(input)
      return ok({
        appointmentId: input.appointmentId,
        startsAtMs: input.newStartsAtMs,
        endsAtMs: input.newStartsAtMs + ONE_HOUR_MS,
        rescheduleCount: 1,
      })
    },
    ...overrides,
  }
  return { deps, requested }
}

describe('performRescheduleAppointment', () => {
  it('mueve la cita y avisa que la administradora tiene que aprobarla de nuevo', async () => {
    const { deps, requested } = createDeps()
    const result = await performRescheduleAppointment(request, deps)

    expect(result).toEqual({ ok: true, message: rescheduleMessages.rescheduled })
    expect(requested).toEqual([request])
  })

  it('sin sesión de clienta no llega a la base', async () => {
    const { deps, requested } = createDeps({ isClient: async () => false })
    const result = await performRescheduleAppointment(request, deps)

    expect(result).toEqual({ ok: false, message: rescheduleMessages.accessDenied })
    expect(requested).toEqual([])
  })

  it.each([
    ['sin cita', { ...request, appointmentId: undefined }],
    ['cita que no es un identificador', { ...request, appointmentId: 'no-es-un-uuid' }],
    ['horario que no es un número', { ...request, newStartsAtMs: '2027-09-27' }],
    ['horario con decimales', { ...request, newStartsAtMs: NEW_STARTS_AT_MS + 0.5 }],
    ['horario negativo', { ...request, newStartsAtMs: -1 }],
    ['estado que no se puede reagendar', { ...request, expectedStatus: 'completed' }],
    ['sin estado', { ...request, expectedStatus: undefined }],
    ['nada', undefined],
  ])('rechaza una solicitud inválida (%s) antes de llegar a la base', async (_label, rawRequest) => {
    const { deps, requested } = createDeps()
    const result = await performRescheduleAppointment(rawRequest, deps)

    expect(result).toEqual({ ok: false, message: rescheduleMessages.invalidRequest })
    expect(requested).toEqual([])
  })

  it.each([
    [clientNotRegistered(), rescheduleMessages.clientNotRegistered],
    [appointmentNotReschedulable(APPOINTMENT_ID), rescheduleMessages.notReschedulable],
    [rescheduleOutsideWindow(APPOINTMENT_ID), rescheduleMessages.outsideWindow],
    [rescheduleLimitReached(APPOINTMENT_ID), rescheduleMessages.limitReached],
    [rescheduleStateChanged(APPOINTMENT_ID), rescheduleMessages.stateChanged],
    [rescheduleSlotNotOffered(APPOINTMENT_ID), rescheduleMessages.slotNotOffered],
    [rescheduleSlotTaken(APPOINTMENT_ID), rescheduleMessages.slotTaken],
    [tooManyPendingAppointments(), rescheduleMessages.tooManyPending],
    [storageFailed('connection refused'), rescheduleMessages.failed],
  ])('el error %# del repositorio llega a la clienta como su mensaje, sin lanzar', async (error, message) => {
    const { deps } = createDeps({ reschedule: async () => err(error) })
    const result = await performRescheduleAppointment(request, deps)

    expect(result).toEqual({ ok: false, message })
  })
})
