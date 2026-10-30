import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { storageFailed } from '../../domain/errors'
import { isDailyAgendaInvalid } from '../../domain/availability-errors'
import type { AgendaAppointment } from '../../domain/daily-agenda'
import type { DailyAgendaRepository, DelinquentClientsPort } from '../ports'
import { getDailyAgenda } from '../daily-agenda'
import { noDelinquentClientsYet } from '../no-delinquency'

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

function createFakeDelinquency(delinquent: string[]): DelinquentClientsPort & { calls: string[][] } {
  const calls: string[][] = []
  return {
    calls,
    async listWithActiveDelinquency(clientIds) {
      calls.push([...clientIds])
      return new Set(delinquent)
    },
  }
}

describe('getDailyAgenda', () => {
  it('pide al repositorio el día del estudio y devuelve las citas con su estado de pago (criterio 1)', async () => {
    const repo = createFakeDailyAgendaRepository([appointment])
    const result = await getDailyAgenda({ repo, delinquency: noDelinquentClientsYet })('2027-03-01')

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(repo.calls).toEqual([[Date.parse('2027-03-01T06:00:00Z'), Date.parse('2027-03-02T06:00:00Z')]])
    expect(result.value.date).toBe('2027-03-01')
    expect(result.value.entries).toHaveLength(1)
    expect(result.value.isTruncated).toBe(false)
    expect(result.value.entries[0]).toMatchObject({ id: 'cita-1', durationMin: 60, paymentStatus: 'covered' })
  })

  it('una fecha inválida se rechaza sin tocar la base', async () => {
    const repo = createFakeDailyAgendaRepository([appointment])
    const result = await getDailyAgenda({ repo, delinquency: noDelinquentClientsYet })('2027-02-30')

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(isDailyAgendaInvalid(result.error)).toBe(true)
    expect(repo.calls).toEqual([])
  })

  it('un día sin citas es una agenda vacía, no un error', async () => {
    const result = await getDailyAgenda({ repo: createFakeDailyAgendaRepository([]), delinquency: noDelinquentClientsYet })('2027-03-01')
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.entries).toEqual([])
  })

  it('propaga el fallo del almacenamiento', async () => {
    const failure = storageFailed('sin conexión')
    const result = await getDailyAgenda({ repo: createFakeDailyAgendaRepository([], failure), delinquency: noDelinquentClientsYet })('2027-03-01')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error).toBe(failure)
  })

  it('marca la morosidad con una sola consulta por lote, con las clientas del día sin repetir (criterio 2, PERF-005)', async () => {
    const repo = createFakeDailyAgendaRepository([
      appointment,
      { ...appointment, id: 'cita-2', startsAtMs: appointment.startsAtMs + 3_600_000 },
      { ...appointment, id: 'cita-3', clientId: 'clienta-2', startsAtMs: appointment.startsAtMs + 7_200_000 },
      { ...appointment, id: 'cita-4', clientId: null, startsAtMs: appointment.startsAtMs + 10_800_000 },
    ])
    const delinquency = createFakeDelinquency(['clienta-2'])
    const result = await getDailyAgenda({ repo, delinquency })('2027-03-01')

    expect(delinquency.calls).toEqual([['clienta-1', 'clienta-2']])
    expect(isOk(result) && result.value.entries.map((entry) => [entry.id, entry.hasActiveDelinquency])).toEqual([
      ['cita-1', false],
      ['cita-2', false],
      ['cita-3', true],
      ['cita-4', false],
    ])
  })

  it('un día sin clientas no consulta la morosidad', async () => {
    const delinquency = createFakeDelinquency([])
    await getDailyAgenda({ repo: createFakeDailyAgendaRepository([]), delinquency })('2027-03-01')
    expect(delinquency.calls).toEqual([])
  })

  it('con el adaptador por defecto, hasta US-MOR-02, ninguna clienta aparece morosa', async () => {
    const result = await getDailyAgenda({ repo: createFakeDailyAgendaRepository([appointment]), delinquency: noDelinquentClientsYet })(
      '2027-03-01',
    )
    expect(isOk(result) && result.value.entries.every((entry) => !entry.hasActiveDelinquency)).toBe(true)
  })
})
