import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { isTooManyAppointmentIds, storageFailed } from '../../domain/errors'
import type {
  AppointmentSummariesRepository,
  AppointmentSummary,
} from '../appointment-summaries-ports'
import { APPOINTMENT_SUMMARIES_MAX_IDS, getAppointmentSummaries } from '../get-appointment-summaries'

const summary: AppointmentSummary = {
  id: 'cita-0',
  startsAtMs: Date.parse('2026-09-15T16:00:00Z'),
  serviceName: 'Clásicas',
}

function createFakeRepository(result: Awaited<ReturnType<AppointmentSummariesRepository['findByIds']>>) {
  const received: (readonly string[])[] = []
  const repository: AppointmentSummariesRepository = {
    async findByIds(appointmentIds) {
      received.push(appointmentIds)
      return result
    },
  }
  return { repository, received }
}

const idsOfLength = (length: number) => Array.from({ length }, (_, index) => `cita-${index}`)

describe('getAppointmentSummaries', () => {
  it('una lista vacía devuelve vacío sin consultar', async () => {
    const { repository, received } = createFakeRepository(ok([summary]))

    const result = await getAppointmentSummaries(repository)([])

    expect(isOk(result) && result.value).toEqual([])
    expect(received).toEqual([])
  })

  it('más ids que el tope devuelve TooManyAppointmentIds sin consultar', async () => {
    const { repository, received } = createFakeRepository(ok([summary]))

    const result = await getAppointmentSummaries(repository)(idsOfLength(APPOINTMENT_SUMMARIES_MAX_IDS + 1))

    expect(isErr(result) && isTooManyAppointmentIds(result.error)).toBe(true)
    expect(received).toEqual([])
  })

  it('con exactamente el tope de ids consulta y devuelve lo del repositorio', async () => {
    const ids = idsOfLength(APPOINTMENT_SUMMARIES_MAX_IDS)
    const { repository, received } = createFakeRepository(ok([summary]))

    const result = await getAppointmentSummaries(repository)(ids)

    expect(isOk(result) && result.value).toEqual([summary])
    expect(received).toEqual([ids])
  })

  it('propaga el error del repositorio', async () => {
    const failure = storageFailed('conexión rechazada')
    const { repository } = createFakeRepository(err(failure))

    const result = await getAppointmentSummaries(repository)(['cita-0'])

    expect(isErr(result) && result.error).toEqual(failure)
  })
})
