import { describe, it, expect, vi } from 'vitest'
import { err, ok, isErr, isOk } from '@/shared/result'
import { listCaseHistory } from '../list-case-history'
import { HISTORY_DEFAULT_PAGE_SIZE, HISTORY_PAGE_SIZES, type HistoryRow } from '../../domain/case-history'
import { delinquencyStorageFailed } from '../../domain/errors'
import type { AppointmentSummariesPort, CaseHistoryRepository, ClientNamesPort } from '../ports'

const ANA = '1c9d1f0e-5a4b-4e0e-8d52-0d6a3e6f9a21'
const LUCIA = '3e8f3b2a-7c6d-4a2a-8f74-2f8c5a8b1c43'
const SHARED_APPOINTMENT = '5a0b5d4c-9e8f-4c4c-a196-4a0e7c0d3e65'
const OTHER_APPOINTMENT = '6b1c6e5d-0f9a-4d5d-b2a7-5b1f8d1e4f76'

const baseRow: HistoryRow = {
  caseId: '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11',
  clientId: ANA,
  appointmentId: SHARED_APPOINTMENT,
  pending: 20000,
  state: 'active',
  detectedAt: new Date('2026-11-01T15:00:00Z'),
  hasPendingRequest: false,
}
const rows: HistoryRow[] = [
  baseRow,
  { ...baseRow, caseId: '8c1f6a9f-4d2b-4d66-8d2f-3a5b7c9e1f22', hasPendingRequest: true },
  { ...baseRow, caseId: '9d2a7bb0-5e3c-4e77-9e30-4b6c8daf2a33', clientId: LUCIA, appointmentId: OTHER_APPOINTMENT, state: 'settled' },
]
const startsAtMs = Date.parse('2026-10-30T16:00:00Z')

function build(overrides: { history?: CaseHistoryRepository; names?: ClientNamesPort; appointments?: AppointmentSummariesPort } = {}) {
  const history: CaseHistoryRepository = overrides.history ?? { list: vi.fn(async () => ok({ rows, total: 61 })) }
  const names: ClientNamesPort = overrides.names ?? {
    namesFor: vi.fn(async () => ok(new Map([[ANA, 'Ana Pérez']]))),
  }
  const appointments: AppointmentSummariesPort = overrides.appointments ?? {
    summariesFor: vi.fn(async () => ok(new Map([[SHARED_APPOINTMENT, { startsAtMs, serviceName: 'Volumen ruso' }]]))),
  }
  return { history, names, appointments, run: listCaseHistory({ history, names, appointments }) }
}

describe('listCaseHistory', () => {
  it('arma la página con nombre, cita y el estado mostrado de cada morosidad', async () => {
    const result = await build().run({ filter: 'all', page: 1, pageSize: HISTORY_PAGE_SIZES[0] })

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toMatchObject({ total: 61, page: 1, pageSize: HISTORY_PAGE_SIZES[0], appointmentsUnavailable: false })
    expect(result.value.items.map((item) => item.state)).toEqual(['active', 'pending_approval', 'settled'])
    expect(result.value.items[0]).toEqual({
      caseId: baseRow.caseId,
      clientName: 'Ana Pérez',
      pending: 20000,
      appointment: { startsAtMs, serviceName: 'Volumen ruso' },
      detectedAt: baseRow.detectedAt,
      state: 'active',
    })
    expect(result.value.items[2]).toMatchObject({ clientName: null, appointment: null })
  })

  it('normaliza la consulta antes de pedir la página', async () => {
    const { history, run } = build()
    await run({ filter: 'borradas', page: -4, pageSize: 7 })

    expect(history.list).toHaveBeenCalledWith({ filter: 'all', page: 0, pageSize: HISTORY_DEFAULT_PAGE_SIZE })
  })

  it('pide nombres y citas una sola vez con los ids sin repetir', async () => {
    const { names, appointments, run } = build()
    await run({})

    expect(names.namesFor).toHaveBeenCalledTimes(1)
    expect(names.namesFor).toHaveBeenCalledWith([ANA, LUCIA])
    expect(appointments.summariesFor).toHaveBeenCalledTimes(1)
    expect(appointments.summariesFor).toHaveBeenCalledWith([SHARED_APPOINTMENT, OTHER_APPOINTMENT])
  })

  it('si fallan las citas la página sale sin cita y avisa que no se pudieron leer', async () => {
    const appointments: AppointmentSummariesPort = { summariesFor: async () => err(delinquencyStorageFailed('caída')) }
    const result = await build({ appointments }).run({})

    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.appointmentsUnavailable).toBe(true)
    expect(result.value.items.every((item) => item.appointment === null)).toBe(true)
    expect(result.value.items[0].clientName).toBe('Ana Pérez')
  })

  it('si fallan los nombres o el repositorio devuelve el error', async () => {
    const names: ClientNamesPort = { namesFor: async () => err(delinquencyStorageFailed('nombres')) }
    const history: CaseHistoryRepository = { list: async () => err(delinquencyStorageFailed('lectura')) }

    const namesFailed = await build({ names }).run({})
    const historyFailed = await build({ history }).run({})

    expect(isErr(namesFailed) && namesFailed.error.message).toBe('nombres')
    expect(isErr(historyFailed) && historyFailed.error.message).toBe('lectura')
  })

  it('una página vacía no pide nombres ni citas', async () => {
    const history: CaseHistoryRepository = { list: async () => ok({ rows: [], total: 0 }) }
    const { names, appointments, run } = build({ history })
    const result = await run({})

    expect(isOk(result) && result.value).toMatchObject({ items: [], total: 0, appointmentsUnavailable: false })
    expect(names.namesFor).not.toHaveBeenCalled()
    expect(appointments.summariesFor).not.toHaveBeenCalled()
  })
})
