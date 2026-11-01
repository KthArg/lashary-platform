import { describe, it, expect, vi } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { UNCLOSED_APPOINTMENTS_LIMIT } from '../../domain/appointment-closing.constants'
import { storageFailed } from '../../domain/errors'
import type { UnclosedAppointment, UnclosedAppointmentsRepository } from '../closing-ports'
import { listUnclosedAppointments } from '../list-unclosed-appointments'

const NOW_MS = Date.parse('2027-03-10T20:00:00Z')

const unclosedAppointment = (position: number): UnclosedAppointment => ({
  id: `cita-${position}`,
  startsAtMs: Date.parse('2027-03-09T16:00:00Z') + position,
  endsAtMs: Date.parse('2027-03-09T17:00:00Z') + position,
  clientId: 'perfil-ana',
  clientName: 'Ana Mora',
  techniqueName: 'Clásicas',
})

const repositoryReturning = (appointments: UnclosedAppointment[]) => {
  const listUnclosed = vi.fn(async () => ok(appointments))
  return { repository: { listUnclosed } satisfies UnclosedAppointmentsRepository, listUnclosed }
}

describe('listUnclosedAppointments — US-AGE-12 criterio 5', () => {
  it('pide al repositorio las que ya terminaron al instante dado, con una de más para saber si hay más', async () => {
    const { repository, listUnclosed } = repositoryReturning([unclosedAppointment(1)])

    await listUnclosedAppointments(repository)(NOW_MS)

    expect(listUnclosed).toHaveBeenCalledWith(NOW_MS, UNCLOSED_APPOINTMENTS_LIMIT + 1)
  })

  it('devuelve las citas sin cerrar y no avisa de más si caben', async () => {
    const { repository } = repositoryReturning([unclosedAppointment(1), unclosedAppointment(2)])

    const result = await listUnclosedAppointments(repository)(NOW_MS)

    expect(isOk(result) && result.value.appointments.map((appointment) => appointment.id)).toEqual(['cita-1', 'cita-2'])
    expect(isOk(result) && result.value.isTruncated).toBe(false)
  })

  it('corta al tope y avisa de que hay más cuando el repositorio devuelve una de más', async () => {
    const all = Array.from({ length: UNCLOSED_APPOINTMENTS_LIMIT + 1 }, (_, position) => unclosedAppointment(position))
    const { repository } = repositoryReturning(all)

    const result = await listUnclosedAppointments(repository)(NOW_MS)

    expect(isOk(result) && result.value.appointments).toHaveLength(UNCLOSED_APPOINTMENTS_LIMIT)
    expect(isOk(result) && result.value.isTruncated).toBe(true)
  })

  it('devuelve el error del repositorio sin lanzar', async () => {
    const failing: UnclosedAppointmentsRepository = { listUnclosed: async () => err(storageFailed('caída')) }

    const result = await listUnclosedAppointments(failing)(NOW_MS)

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
