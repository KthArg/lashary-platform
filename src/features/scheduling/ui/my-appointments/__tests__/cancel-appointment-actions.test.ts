import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MY_APPOINTMENTS_PATH } from '../constants/my-appointments-strings'
import { cancelAppointmentAction, quoteCancellationAction } from '../actions/cancel-appointment-actions'
import type { CancelAppointmentResult, QuoteCancellationResult } from '../types/cancellation-results'

const APPOINTMENT_ID = '00000000-0000-4000-8000-00000000ca01'

let quoteResult: QuoteCancellationResult
let cancelResult: CancelAppointmentResult
const mockQuote = vi.fn(async (_appointmentId: unknown) => quoteResult)
const mockCancel = vi.fn(async (_appointmentId: unknown, _expectedForfeitedDeposit: unknown) => cancelResult)
const mockRevalidatePath = vi.fn()

vi.mock('../services/cancellation-service', () => ({
  cancellationService: {
    quote: (appointmentId: unknown) => mockQuote(appointmentId),
    cancel: (appointmentId: unknown, expectedForfeitedDeposit: unknown) =>
      mockCancel(appointmentId, expectedForfeitedDeposit),
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: (path: string) => mockRevalidatePath(path) }))

beforeEach(() => {
  mockQuote.mockClear()
  mockCancel.mockClear()
  mockRevalidatePath.mockClear()
})

describe('quoteCancellationAction', () => {
  it('entrega al servicio solo la cita y devuelve lo que el servicio responde, sin refrescar la pantalla', async () => {
    quoteResult = { ok: true, quote: { appointmentId: APPOINTMENT_ID, consequence: 'x', losesDeposit: false, forfeitedDeposit: 0 } }

    expect(await quoteCancellationAction(APPOINTMENT_ID)).toEqual(quoteResult)
    expect(mockQuote).toHaveBeenCalledWith(APPOINTMENT_ID)
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})

describe('cancelAppointmentAction', () => {
  it('al cancelar con éxito refresca la lista de mis citas', async () => {
    cancelResult = { ok: true, message: 'Tu cita fue cancelada.' }

    expect(await cancelAppointmentAction(APPOINTMENT_ID, 10000)).toEqual(cancelResult)
    expect(mockCancel).toHaveBeenCalledWith(APPOINTMENT_ID, 10000)
    expect(mockRevalidatePath).toHaveBeenCalledWith(MY_APPOINTMENTS_PATH)
  })

  it('si falla no refresca nada y devuelve el mensaje', async () => {
    cancelResult = { ok: false, message: 'No pudimos procesar tu solicitud. Intentá de nuevo.' }

    expect(await cancelAppointmentAction(APPOINTMENT_ID, 0)).toEqual(cancelResult)
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})
