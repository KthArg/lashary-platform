import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { spaceNotAvailable } from '../../domain/errors'
import { MS_PER_MINUTE } from '../../domain/appointment-window.constants'
import { createAppointment } from '../create-appointment'
import type { AppointmentRepository, NewAppointment } from '../ports'

const RESOURCE_ID = 'recurso-estudio'
const SERVICE_START_MS = Date.parse('2027-03-01T10:00:00Z')
const SERVICE_DURATION_MIN = 60
const PREP_MIN = 15
const CLEANUP_MIN = 10
const input = {
  resourceId: RESOURCE_ID,
  startsAtMs: SERVICE_START_MS,
  serviceDurationMin: SERVICE_DURATION_MIN,
  prepMin: PREP_MIN,
  cleanupMin: CLEANUP_MIN,
}

function createFakeAppointmentRepository(takenResourceIds: Set<string> = new Set()) {
  const received: NewAppointment[] = []
  const repository: AppointmentRepository = {
    async create(appointment) {
      received.push(appointment)
      if (takenResourceIds.has(appointment.resourceId)) {
        return err(spaceNotAvailable(appointment.resourceId))
      }
      return ok({ id: 'cita-1', resourceId: appointment.resourceId })
    },
  }
  return { repository, received }
}

describe('createAppointment', () => {
  it('entrega al repositorio el rango ocupado calculado por el dominio', async () => {
    const { repository, received } = createFakeAppointmentRepository()
    const result = await createAppointment(repository, input)

    expect(isOk(result)).toBe(true)
    expect(received).toEqual([
      {
        resourceId: RESOURCE_ID,
        startsAtMs: SERVICE_START_MS,
        endsAtMs: SERVICE_START_MS + SERVICE_DURATION_MIN * MS_PER_MINUTE,
        occupiedFromMs: SERVICE_START_MS - PREP_MIN * MS_PER_MINUTE,
        occupiedUntilMs:
          SERVICE_START_MS + (SERVICE_DURATION_MIN + CLEANUP_MIN) * MS_PER_MINUTE,
      },
    ])
  })

  it('una ventana inválida se rechaza sin tocar el repositorio', async () => {
    const { repository, received } = createFakeAppointmentRepository()
    const result = await createAppointment(repository, { ...input, serviceDurationMin: 0 })

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_INVALID_APPOINTMENT_WINDOW')
    expect(received).toHaveLength(0)
  })

  it('el espacio ocupado llega como SpaceNotAvailable, no como excepción', async () => {
    const { repository } = createFakeAppointmentRepository(new Set([RESOURCE_ID]))
    const result = await createAppointment(repository, input)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_SPACE_NOT_AVAILABLE')
  })
})
