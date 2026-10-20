import { describe, it, expect, vi, beforeEach } from 'vitest'
import { bookAppointmentAction } from '../actions/book-appointment-action'
import { INITIAL_BOOKING_ACTION_STATE } from '../types/booking-action-state'
import type { BookingOutcome } from '../utils/perform-booking'

const BACK_HREF = '/portal/citas/calendario?servicio=t1&fecha=2027-03-01&aviso=ocupado'

let outcome: BookingOutcome
const mockBook = vi.fn(async (_fields: unknown) => outcome)
const mockRedirect = vi.fn((href: string) => {
  throw new Error(`REDIRECT:${href}`)
})

vi.mock('../services/booking-service', () => ({ bookingService: { book: (fields: unknown) => mockBook(fields) } }))
vi.mock('next/navigation', () => ({ redirect: (href: string) => mockRedirect(href) }))

const formData = (values: Record<string, string>) => {
  const data = new FormData()
  for (const [name, value] of Object.entries(values)) data.set(name, value)
  data.set('archivo', new File(['x'], 'x.txt'))
  return data
}

beforeEach(() => {
  mockBook.mockClear()
  mockRedirect.mockClear()
})

describe('bookAppointmentAction', () => {
  it('entrega al servicio solo los campos de texto del formulario', async () => {
    outcome = { kind: 'failed', message: 'x' }
    await bookAppointmentAction(INITIAL_BOOKING_ACTION_STATE, formData({ servicio: 't1', fecha: '2027-03-01', espacio: '600' }))

    expect(mockBook).toHaveBeenCalledWith({ servicio: 't1', fecha: '2027-03-01', espacio: '600' })
  })

  const booked = { status: 'pendiente', summary: {} as never }
  it.each([
    ['una reserva hecha devuelve su detalle', { kind: 'booked', booked } as const, { status: 'booked', booked }],
    ['un fallo devuelve el mensaje', { kind: 'failed', message: 'No pudimos.' } as const, { status: 'error', message: 'No pudimos.' }],
  ])('%s, sin redirigir', async (_name, result, expectedState) => {
    outcome = result
    expect(await bookAppointmentAction(INITIAL_BOOKING_ACTION_STATE, formData({}))).toEqual(expectedState)
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('si hay que elegir otro horario, redirige al calendario', async () => {
    outcome = { kind: 'retry', backHref: BACK_HREF }

    await expect(bookAppointmentAction(INITIAL_BOOKING_ACTION_STATE, formData({}))).rejects.toThrow(`REDIRECT:${BACK_HREF}`)
    expect(mockRedirect).toHaveBeenCalledWith(BACK_HREF)
  })
})
