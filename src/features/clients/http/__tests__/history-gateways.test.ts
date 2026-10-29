import { describe, it, expect, vi, beforeEach } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { schedulingAppointmentHistory } from '@/features/clients/http/history/history-gateways'

const mockListClientAppointments = vi.fn()

vi.mock('@/features/scheduling', () => ({
  listClientAppointments: (query: unknown) => mockListClientAppointments(query),
}))

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'

const schedulingAppointment = {
  id: 'cita-1',
  startsAtMs: Date.parse('2026-09-15T16:00:00Z'),
  status: 'no_show',
  techniqueName: 'Clásicas',
  depositRequired: 10000,
  depositRegistered: 10000,
}

beforeEach(() => vi.clearAllMocks())

describe('schedulingAppointmentHistory — el historial sale del contrato de scheduling', () => {
  it('pide las citas de la clienta y la página, y traduce cada cita a un registro del historial', async () => {
    mockListClientAppointments.mockResolvedValue(
      ok({ items: [schedulingAppointment], total: 1, page: 2, pageSize: 25 }),
    )
    const result = await schedulingAppointmentHistory({ clientId: CLIENT_ID, page: 2 })

    expect(mockListClientAppointments).toHaveBeenCalledWith({ clientId: CLIENT_ID, page: 2 })
    expect(isOk(result) && result.value).toEqual({
      records: [
        {
          id: 'cita-1',
          startsAtMs: schedulingAppointment.startsAtMs,
          status: 'no_show',
          serviceName: 'Clásicas',
          depositRequired: 10000,
          depositRegistered: 10000,
        },
      ],
      total: 1,
      page: 2,
      pageSize: 25,
    })
  })

  it('si scheduling responde con un fallo de la base, el historial no está disponible', async () => {
    mockListClientAppointments.mockResolvedValue(err({ code: 'SCHEDULING_STORAGE_FAILED', message: 'caída' }))
    const result = await schedulingAppointmentHistory({ clientId: CLIENT_ID })

    expect(isErr(result) && result.error).toBe('history-unavailable')
  })

  it('si scheduling lanza, el historial no está disponible en vez de romper la página', async () => {
    mockListClientAppointments.mockRejectedValue(new Error('sin cookies'))
    const result = await schedulingAppointmentHistory({ clientId: CLIENT_ID })

    expect(isErr(result) && result.error).toBe('history-unavailable')
  })
})
