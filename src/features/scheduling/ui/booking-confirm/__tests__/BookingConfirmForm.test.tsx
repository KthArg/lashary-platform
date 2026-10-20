import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { bookingConfirmMessages } from '../constants/booking-confirm-strings'
import { BookingConfirmForm } from '../components/BookingConfirmForm'
import type { BookingActionState } from '../types/booking-action-state'

const mockAction = vi.fn<(previous: BookingActionState, formData: FormData) => Promise<BookingActionState>>()

vi.mock('../actions/book-appointment-action', () => ({
  bookAppointmentAction: (previous: BookingActionState, formData: FormData) => mockAction(previous, formData),
}))

beforeEach(() => mockAction.mockReset())
afterEach(cleanup)

const BACK_HREF = '/portal/citas/calendario?servicio=t1&fecha=2027-03-01'
const summary = {
  service: 'Clásicas — primera vez',
  when: 'lunes, 1 de marzo de 2027 · 10:00–11:00',
  duration: '60 min',
  price: '₡35 000',
  deposit: '₡10 000',
  depositNotice: bookingConfirmMessages.depositNotice,
}
const props = { fields: { serviceKey: 't1', date: '2027-03-01', startMin: 600 }, summary, backHref: BACK_HREF }

const submit = () => fireEvent.click(screen.getByRole('button', { name: bookingConfirmMessages.confirm }))

describe('BookingConfirmForm — US-AGE-05', () => {
  it('manda a la acción solo el servicio, la fecha y el espacio elegidos', async () => {
    mockAction.mockResolvedValue({ status: 'error', message: 'x' })
    render(<BookingConfirmForm {...props} />)
    submit()

    await waitFor(() => expect(mockAction).toHaveBeenCalled())
    const sent = mockAction.mock.calls[0][1]
    expect(Object.fromEntries(sent.entries())).toEqual({ servicio: 't1', fecha: '2027-03-01', espacio: '600' })
  })

  it('al reservar, muestra la confirmación con el detalle y que queda pendiente de aprobación (criterio 5)', async () => {
    mockAction.mockResolvedValue({
      status: 'booked',
      booked: { status: bookingConfirmMessages.pendingApproval, summary },
    })
    render(<BookingConfirmForm {...props} />)
    submit()

    expect((await screen.findByRole('status')).textContent).toBe(bookingConfirmMessages.pendingApproval)
    expect(screen.getByText(bookingConfirmMessages.bookedTitle)).toBeTruthy()
    expect(screen.getByText(summary.service)).toBeTruthy()
    expect(screen.queryByRole('button', { name: bookingConfirmMessages.confirm })).toBeNull()
  })

  it('si falla, muestra el mensaje y deja intentar de nuevo o elegir otro horario', async () => {
    mockAction.mockResolvedValue({ status: 'error', message: bookingConfirmMessages.storageFailed })
    render(<BookingConfirmForm {...props} />)
    submit()

    expect((await screen.findByRole('alert')).textContent).toContain(bookingConfirmMessages.storageFailed)
    expect(screen.getByRole('button', { name: bookingConfirmMessages.confirm })).toBeTruthy()
    expect(screen.getByRole('link', { name: bookingConfirmMessages.changeSlot }).getAttribute('href')).toBe(BACK_HREF)
  })
})
