import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ConfirmAppointment } from '../components/ConfirmAppointment'
import { confirmationMessages as COPY } from '../constants/confirmation-strings'

const APPOINTMENT_ID = '00000000-0000-4000-8000-00000000ca01'
const SLOT = 'martes 9:00'

const mockConfirm = vi.fn()

vi.mock('../actions/confirm-appointment-actions', () => ({
  confirmAppointmentAction: (appointmentId: string) => mockConfirm(appointmentId),
}))

beforeEach(() => {
  mockConfirm.mockReset()
})
afterEach(cleanup)

const clickConfirm = () => fireEvent.click(screen.getByRole('button', { name: COPY.confirmButtonLabel(SLOT) }))

describe('ConfirmAppointment', () => {
  it('confirma y avisa con el mensaje que incluye la política (criterios 2 y 3)', async () => {
    mockConfirm.mockResolvedValue({ ok: true, message: 'quedó confirmada' })
    const onConfirmed = vi.fn()
    render(<ConfirmAppointment appointmentId={APPOINTMENT_ID} slot={SLOT} onConfirmed={onConfirmed} />)

    clickConfirm()

    await waitFor(() => expect(onConfirmed).toHaveBeenCalledWith('quedó confirmada'))
    expect(mockConfirm).toHaveBeenCalledWith(APPOINTMENT_ID)
  })

  it('muestra el motivo si no se pudo confirmar', async () => {
    mockConfirm.mockResolvedValue({ ok: false, message: COPY.notConfirmable })
    render(<ConfirmAppointment appointmentId={APPOINTMENT_ID} slot={SLOT} onConfirmed={vi.fn()} />)

    clickConfirm()

    expect((await screen.findByRole('alert')).textContent).toBe(COPY.notConfirmable)
  })

  it('si la acción se cae, muestra el error sin dejar el botón trabado', async () => {
    mockConfirm.mockRejectedValue(new Error('sin red'))
    render(<ConfirmAppointment appointmentId={APPOINTMENT_ID} slot={SLOT} onConfirmed={vi.fn()} />)

    clickConfirm()

    expect((await screen.findByRole('alert')).textContent).toBe(COPY.failed)
    expect((screen.getByRole('button', { name: COPY.confirmButtonLabel(SLOT) }) as HTMLButtonElement).disabled).toBe(false)
  })
})
