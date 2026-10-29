import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { cancellationMessages } from '../constants/cancellation-strings'
import { myAppointmentsMessages } from '../constants/my-appointments-strings'
import { MyAppointmentsContent } from '../components/MyAppointmentsContent'
import type { MyAppointmentView } from '../types/my-appointments.types'

const APPOINTMENT_ID = '00000000-0000-4000-8000-00000000ca01'
const SLOT = 'martes, 12 de abril'
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

const only: MyAppointmentView = {
  id: APPOINTMENT_ID,
  service: 'Clásicas',
  kind: 'Primera vez',
  slot: SLOT,
  status: myAppointmentsMessages.status.approved,
  amounts: null,
  heldNote: null,
}

async function cancelTheOnlyAppointment() {
  mockQuote.mockResolvedValue({
    ok: true,
    quote: { appointmentId: APPOINTMENT_ID, consequence: copy.withinWindow, losesDeposit: false, forfeitedDeposit: 0 },
  })
  mockCancel.mockResolvedValue({ ok: true, message: copy.cancelled })
  fireEvent.click(screen.getByRole('button', { name: copy.cancelButtonLabel(SLOT) }))
  fireEvent.click(await screen.findByRole('button', { name: copy.confirmYes }))
  await waitFor(() => expect(screen.getByRole('status').textContent).toBe(copy.cancelled))
}

describe('MyAppointmentsContent', () => {
  it('sin cancelar nada no hay ningún aviso', () => {
    render(<MyAppointmentsContent view={{ status: 'ready', appointments: [only] }} />)

    expect(screen.queryByRole('status')).toBeNull()
  })

  it('al cancelar una cita deja el aviso y manda el foco a él', async () => {
    render(<MyAppointmentsContent view={{ status: 'ready', appointments: [only] }} />)
    await cancelTheOnlyAppointment()

    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('status')))
  })

  it('si era la última cita, el aviso sigue visible cuando la pantalla pasa a «sin citas»', async () => {
    const { rerender } = render(<MyAppointmentsContent view={{ status: 'ready', appointments: [only] }} />)
    await cancelTheOnlyAppointment()

    rerender(<MyAppointmentsContent view={{ status: 'empty' }} />)

    expect(screen.getByRole('status').textContent).toBe(copy.cancelled)
    expect(screen.getByText(myAppointmentsMessages.empty)).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })
})
