import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { storageFailed } from '../../domain/errors'
import { isDailyAgendaInvalid } from '../../domain/availability-errors'
import type { AgendaAppointment } from '../../domain/daily-agenda'
import type { DailyAgendaRepository } from '../ports'
import { getDailyAgenda } from '../daily-agenda'

const appointment: AgendaAppointment = {
  id: 'cita-1',
  status: 'confirmed',
  startsAtMs: Date.parse('2027-03-01T16:00:00Z'),
  endsAtMs: Date.parse('2027-03-01T17:00:00Z'),
  clientId: 'clienta-1',
  clientName: 'Ana Mora',
  techniqueName: 'Clásicas',
  isFirstTime: false,
  depositRequired: 10000,
  depositRegistered: 10000,
}

type FakeDailyAgendaRepository = DailyAgendaRepository & { calls: Array<[number, number]> }

function createFakeDailyAgendaRepository(
  appointments: AgendaAppointment[],
  failure?: ReturnType<typeof storageFailed>,
): FakeDailyAgendaRepository {
  const calls: Array<[number, number]> = []
  return {
    calls,
    async listBetween(fromMs, untilMs) {
      calls.push([fromMs, untilMs])
      return failure ? err(failure) : ok(appointments)
    },
  }
}

describe('getDailyAgenda', () => {
  it('pide al repositorio el día del estudio y devuelve las citas con su estado de pago (criterio 1)', async () => {
    const repo = createFakeDailyAgendaRepository([appointment])
    const result = await getDailyAgenda({ repo })('2027-03-01')

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(repo.calls).toEqual([[Date.parse('2027-03-01T06:00:00Z'), Date.parse('2027-03-02T06:00:00Z')]])
    expect(result.value.date).toBe('2027-03-01')
    expect(result.value.entries).toHaveLength(1)
    expect(result.value.entries[0]).toMatchObject({ id: 'cita-1', durationMin: 60, paymentStatus: 'covered' })
  })

  it('una fecha inválida se rechaza sin tocar la base', async () => {
    const repo = createFakeDailyAgendaRepository([appointment])
    const result = await getDailyAgenda({ repo })('2027-02-30')

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(isDailyAgendaInvalid(result.error)).toBe(true)
    expect(repo.calls).toEqual([])
  })

  it('un día sin citas es una agenda vacía, no un error', async () => {
    const result = await getDailyAgenda({ repo: createFakeDailyAgendaRepository([]) })('2027-03-01')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.entries).toEqual([])
  })

  it('propaga el fallo del almacenamiento', async () => {
    const failure = storageFailed('sin conexión')
    const result = await getDailyAgenda({ repo: createFakeDailyAgendaRepository([], failure) })('2027-03-01')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error).toBe(failure)
  })
})
