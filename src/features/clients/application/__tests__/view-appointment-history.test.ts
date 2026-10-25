import { describe, it, expect, vi } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { viewAppointmentHistory } from '../history/view-appointment-history'
import type { AppointmentHistorySource } from '../history/history-ports'
import type { AppointmentHistoryRecord } from '../../domain/history/appointment-history.types'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const FIRST_PAGE = { total: 2, page: 0, pageSize: 25 }

const historyRecord = (overrides: Partial<AppointmentHistoryRecord>): AppointmentHistoryRecord => ({
  id: 'cita-1',
  startsAtMs: Date.parse('2026-09-15T16:00:00Z'),
  status: 'completed',
  serviceName: 'Clásicas',
  depositRequired: 0,
  depositRegistered: 0,
  ...overrides,
})

describe('viewAppointmentHistory', () => {
  it('pide la página de la clienta y le pone a cada cita el estado de su anticipo, sin cambiar el orden', async () => {
    const newest = historyRecord({ id: 'cita-2', serviceName: 'Volumen', depositRequired: 15000, depositRegistered: 15000 })
    const oldest = historyRecord({ status: 'cancelled' })
    const source = vi.fn<AppointmentHistorySource>().mockResolvedValue(ok({ records: [newest, oldest], ...FIRST_PAGE }))
    const result = await viewAppointmentHistory(source)({ clientId: CLIENT_ID, page: 0 })

    expect(source).toHaveBeenCalledWith({ clientId: CLIENT_ID, page: 0 })
    if (!isOk(result)) throw new Error('debería leer')
    expect(result.value.entries[0]).toEqual({
      id: 'cita-2',
      startsAtMs: newest.startsAtMs,
      status: 'completed',
      serviceName: 'Volumen',
      depositStatus: 'registered',
    })
    expect(result.value.entries.map((entry) => [entry.id, entry.depositStatus])).toEqual([
      ['cita-2', 'registered'],
      ['cita-1', 'none'],
    ])
    expect(result.value).toMatchObject(FIRST_PAGE)
  })

  it('una clienta sin citas es un historial vacío, no un error', async () => {
    const source = vi.fn<AppointmentHistorySource>().mockResolvedValue(ok({ records: [], ...FIRST_PAGE, total: 0 }))
    const result = await viewAppointmentHistory(source)({ clientId: CLIENT_ID })

    expect(isOk(result) && result.value.entries).toEqual([])
  })

  it('si las citas no se pueden leer, responde history-unavailable', async () => {
    const source = vi.fn<AppointmentHistorySource>().mockResolvedValue(err('history-unavailable'))
    const result = await viewAppointmentHistory(source)({ clientId: CLIENT_ID })

    expect(isErr(result) && result.error).toBe('history-unavailable')
  })
})
