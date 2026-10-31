import { describe, it, expect, vi, beforeEach } from 'vitest'
import { rescheduleAppointmentAction } from '../actions/reschedule-appointment-action'
import type { RescheduleAppointmentResult } from '../types/reschedule-results'

const request = {
  appointmentId: '00000000-0000-4000-8000-00000000ea01',
  newStartsAtMs: Date.parse('2027-09-27T15:00:00Z'),
  expectedStatus: 'approved',
}

let serviceResult: RescheduleAppointmentResult
const mockReschedule = vi.fn(async (_rawRequest: unknown) => serviceResult)

vi.mock('../services/reschedule-service', () => ({
  rescheduleService: { reschedule: (rawRequest: unknown) => mockReschedule(rawRequest) },
}))

beforeEach(() => {
  mockReschedule.mockClear()
})

describe('rescheduleAppointmentAction', () => {
  it('entrega la solicitud al servicio y devuelve lo que responde, sin refrescar la pantalla', async () => {
    serviceResult = { ok: true, message: 'Tu cita fue movida.' }

    expect(await rescheduleAppointmentAction(request)).toEqual(serviceResult)
    expect(mockReschedule).toHaveBeenCalledWith(request)
  })

  it('si falla devuelve el mensaje', async () => {
    serviceResult = { ok: false, message: 'Alguien tomó ese horario. Elegí otro.' }

    expect(await rescheduleAppointmentAction(request)).toEqual(serviceResult)
  })
})
