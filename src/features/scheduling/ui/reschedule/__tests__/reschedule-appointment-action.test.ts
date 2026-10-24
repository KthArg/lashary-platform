import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MY_APPOINTMENTS_PATH } from '../../my-appointments/constants/my-appointments-strings'
import { rescheduleAppointmentAction } from '../actions/reschedule-appointment-action'
import type { RescheduleAppointmentResult } from '../types/reschedule-results'

const request = {
  appointmentId: '00000000-0000-0000-0000-00000000ea01',
  newStartsAtMs: Date.parse('2027-09-27T15:00:00Z'),
  expectedStatus: 'approved',
}

let serviceResult: RescheduleAppointmentResult
const mockReschedule = vi.fn(async (_rawRequest: unknown) => serviceResult)
const mockRevalidatePath = vi.fn()

vi.mock('../services/reschedule-service', () => ({
  rescheduleService: { reschedule: (rawRequest: unknown) => mockReschedule(rawRequest) },
}))
vi.mock('next/cache', () => ({ revalidatePath: (path: string) => mockRevalidatePath(path) }))

beforeEach(() => {
  mockReschedule.mockClear()
  mockRevalidatePath.mockClear()
})

describe('rescheduleAppointmentAction', () => {
  it('entrega la solicitud al servicio y, si se movió, refresca la lista de mis citas', async () => {
    serviceResult = { ok: true, message: 'Tu cita fue movida.' }

    expect(await rescheduleAppointmentAction(request)).toEqual(serviceResult)
    expect(mockReschedule).toHaveBeenCalledWith(request)
    expect(mockRevalidatePath).toHaveBeenCalledWith(MY_APPOINTMENTS_PATH)
  })

  it('si falla no refresca nada y devuelve el mensaje', async () => {
    serviceResult = { ok: false, message: 'Alguien tomó ese horario. Elegí otro.' }

    expect(await rescheduleAppointmentAction(request)).toEqual(serviceResult)
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})
