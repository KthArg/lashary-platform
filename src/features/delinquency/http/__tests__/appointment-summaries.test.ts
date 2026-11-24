import { describe, it, expect, vi } from 'vitest'
import { err, ok, isErr, isOk } from '@/shared/result'

const mockGetAppointmentSummaries = vi.fn()

vi.mock('@/features/scheduling', () => ({
  getAppointmentSummaries: (...args: unknown[]) => mockGetAppointmentSummaries(...args),
}))

import { appointmentSummaries } from '../appointment-summaries'

const APPOINTMENT = '5a0b5d4c-9e8f-4c4c-a196-4a0e7c0d3e65'

describe('appointmentSummaries.summariesFor', () => {
  it('pide las citas a scheduling y las devuelve por id con su fecha y servicio', async () => {
    const startsAtMs = Date.parse('2026-10-30T16:00:00Z')
    mockGetAppointmentSummaries.mockResolvedValue(ok([{ id: APPOINTMENT, startsAtMs, serviceName: null }]))
    const result = await appointmentSummaries().summariesFor([APPOINTMENT])

    expect(mockGetAppointmentSummaries).toHaveBeenCalledWith([APPOINTMENT])
    expect(isOk(result) && result.value.get(APPOINTMENT)).toEqual({ startsAtMs, serviceName: null })
  })

  it('traduce el error de scheduling a un fallo de almacenamiento de morosidades', async () => {
    mockGetAppointmentSummaries.mockResolvedValue(err({ code: 'SCHEDULING_STORAGE_FAILED', message: 'caída' }))
    const result = await appointmentSummaries().summariesFor([APPOINTMENT])

    expect(isErr(result) && result.error).toEqual({ code: 'DELINQUENCY_STORAGE_FAILED', message: 'caída' })
  })
})
