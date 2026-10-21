import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { cancellationMessages } from '../constants/cancellation-strings'
import { myAppointmentsMessages } from '../constants/my-appointments-strings'
import { MyAppointmentsList } from '../components/MyAppointmentsList'
import type { MyAppointmentView } from '../types/my-appointments.types'

const FIRST_ID = '00000000-0000-0000-0000-00000000ca01'
const SECOND_ID = '00000000-0000-0000-0000-00000000ca02'
const copy = cancellationMessages

const mockQuote = vi.fn()
const mockCancel = vi.fn()

vi.mock('../actions/cancel-appointment-actions', () => ({
  quoteCancellationAction: (appointmentId: string) => mockQuote(appointmentId),
  cancelAppointmentAction: (appointmentId: string) => mockCancel(appointmentId),
}))

beforeEach(() => {
  mockQuote.mockReset()
  mockCancel.mockReset()
})
afterEach(cleanup)

const appointment = (id: string, slot: string): MyAppointmentView => ({
  id,
  service: 'Clásicas',
  kind: 'Primera vez',
  slot,
  status: myAppointmentsMessages.status.approved,
  amounts: 'Precio ₡35 000 · Anticipo ₡10 000',
})
const appointments = [appointment(FIRST_ID, 'martes, 12 de abril'), appointment(SECOND_ID, 'martes, 19 de abril')]

describe('MyAppointmentsList', () => {
  it('cada cita trae su propio botón para cancelar', () => {
    render(<MyAppointmentsList appointments={appointments} />)

    const items = within(screen.getByRole('list', { name: myAppointmentsMessages.listLabel })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    for (const item of items) expect(within(item).getByRole('button', { name: /^Cancelar la cita del/ })).toBeTruthy()
  })

  it('cancela solo la cita elegida y deja el aviso en la lista', async () => {
    mockQuote.mockResolvedValue({ ok: true, quote: { appointmentId: SECOND_ID, consequence: copy.withinWindow, losesDeposit: false } })
    mockCancel.mockResolvedValue({ ok: true, message: copy.cancelled })
    render(<MyAppointmentsList appointments={appointments} />)

    fireEvent.click(screen.getByRole('button', { name: copy.cancelButtonLabel('martes, 19 de abril') }))
    fireEvent.click(await screen.findByRole('button', { name: copy.confirmYes }))

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(copy.cancelled))
    expect(mockQuote).toHaveBeenCalledWith(SECOND_ID)
    expect(mockCancel).toHaveBeenCalledWith(SECOND_ID)
    expect(mockCancel).toHaveBeenCalledTimes(1)
  })

  it('sin cancelar nada no hay ningún aviso', () => {
    render(<MyAppointmentsList appointments={appointments} />)

    expect(screen.queryByRole('status')).toBeNull()
  })
})
