import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { cancellationMessages } from '../constants/cancellation-strings'
import { myAppointmentsMessages } from '../constants/my-appointments-strings'
import { MyAppointmentsList } from '../components/MyAppointmentsList'
import type { MyAppointmentView } from '../types/my-appointments.types'

const FIRST_ID = '00000000-0000-4000-8000-00000000ca01'
const SECOND_ID = '00000000-0000-4000-8000-00000000ca02'
const copy = cancellationMessages

const mockQuote = vi.fn()
const mockCancel = vi.fn()

vi.mock('../actions/cancel-appointment-actions', () => ({
  quoteCancellationAction: (appointmentId: string) => mockQuote(appointmentId),
  cancelAppointmentAction: (appointmentId: string, expectedForfeitedDeposit: number) =>
    mockCancel(appointmentId, expectedForfeitedDeposit),
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
  heldNote: null,
})
const appointments = [appointment(FIRST_ID, 'martes, 12 de abril'), appointment(SECOND_ID, 'martes, 19 de abril')]

describe('MyAppointmentsList', () => {
  it('una cita con reagendado pendiente muestra la nota del horario que se mantiene; las demás no', () => {
    const heldNote = myAppointmentsMessages.heldSchedule('martes, 5 de abril')
    render(<MyAppointmentsList appointments={[{ ...appointments[0], heldNote }, appointments[1]]} onCancelled={vi.fn()} />)

    const notes = screen.getAllByRole('note')
    expect(notes).toHaveLength(1)
    expect(notes[0].textContent).toBe(heldNote)
  })

  it('cada cita trae su propio botón para cancelar', () => {
    render(<MyAppointmentsList appointments={appointments} onCancelled={vi.fn()} />)

    const items = within(screen.getByRole('list', { name: myAppointmentsMessages.listLabel })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    for (const item of items) expect(within(item).getByRole('button', { name: /^Cancelar la cita del/ })).toBeTruthy()
  })

  it('cancela solo la cita elegida y avisa con el mensaje', async () => {
    mockQuote.mockResolvedValue({
      ok: true,
      quote: { appointmentId: SECOND_ID, consequence: copy.withinWindow, losesDeposit: false, forfeitedDeposit: 0 },
    })
    mockCancel.mockResolvedValue({ ok: true, message: copy.cancelled })
    const onCancelled = vi.fn()
    render(<MyAppointmentsList appointments={appointments} onCancelled={onCancelled} />)

    fireEvent.click(screen.getByRole('button', { name: copy.cancelButtonLabel('martes, 19 de abril') }))
    fireEvent.click(await screen.findByRole('button', { name: copy.confirmYes }))

    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith(copy.cancelled))
    expect(mockQuote).toHaveBeenCalledWith(SECOND_ID)
    expect(mockCancel).toHaveBeenCalledWith(SECOND_ID, 0)
    expect(mockCancel).toHaveBeenCalledTimes(1)
  })
})
