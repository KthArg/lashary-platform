import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { MY_APPOINTMENTS_PATH } from '../../my-appointments/constants/my-appointments-strings'
import { RescheduleForm } from '../components/RescheduleForm'
import { reschedulePageMessages } from '../constants/reschedule-page-strings'
import { rescheduleMessages } from '../constants/reschedule-strings'
import type { RescheduleView } from '../types/reschedule-view.types'

const copy = reschedulePageMessages
const APPOINTMENT_ID = '00000000-0000-0000-0000-00000000ea01'
const FREE_STARTS_AT_MS = Date.parse('2027-09-06T15:00:00Z')
const OTHER_FREE_STARTS_AT_MS = Date.parse('2027-09-06T16:00:00Z')
const BUSY_STARTS_AT_MS = Date.parse('2027-09-06T15:30:00Z')

const mockReschedule = vi.fn()
vi.mock('../actions/reschedule-appointment-action', () => ({
  rescheduleAppointmentAction: (request: unknown) => mockReschedule(request),
}))

const view: Extract<RescheduleView, { status: 'ready' }> = {
  status: 'ready',
  appointmentId: APPOINTMENT_ID,
  expectedStatus: 'approved',
  current: 'Clásicas · viernes',
  remaining: copy.remaining(1),
  consequence: copy.backToPending,
  day: { title: 'Lunes 6 de septiembre', previousHref: null, nextHref: '/siguiente' },
  slots: [
    { startMin: 540, range: '09:00–10:15', busy: false, startsAtMs: FREE_STARTS_AT_MS },
    { startMin: 570, range: '09:30–10:45', busy: true, startsAtMs: BUSY_STARTS_AT_MS },
    { startMin: 600, range: '10:00–11:15', busy: false, startsAtMs: OTHER_FREE_STARTS_AT_MS },
  ],
}

beforeEach(() => {
  mockReschedule.mockReset()
})
afterEach(cleanup)

const submitButton = () => screen.getByRole('button', { name: copy.confirmButton }) as HTMLButtonElement
const chooseFirstFreeSlot = () => fireEvent.click(screen.getAllByRole('radio')[0])

describe('RescheduleForm', () => {
  it('antes de elegir un espacio avisa qué hacer y no deja confirmar', () => {
    render(<RescheduleForm view={view} />)

    expect(screen.getByText(copy.chooseSlot)).toBeTruthy()
    expect(submitButton().disabled).toBe(true)
  })

  it('dice antes de confirmar que la cita vuelve a pendiente y que se conserva el anticipo', () => {
    render(<RescheduleForm view={view} />)

    expect(screen.getByRole('note').textContent).toBe(copy.backToPending)
  })

  it('al elegir un espacio libre deja confirmar', () => {
    render(<RescheduleForm view={view} />)
    chooseFirstFreeSlot()

    expect((screen.getAllByRole('radio')[0] as HTMLInputElement).checked).toBe(true)
    expect(submitButton().disabled).toBe(false)
    expect(screen.queryByText(copy.chooseSlot)).toBeNull()
  })

  it('confirmar manda la cita, el horario elegido y el estado que vio la clienta', async () => {
    mockReschedule.mockResolvedValue({ ok: true, message: rescheduleMessages.rescheduled })
    render(<RescheduleForm view={view} />)
    chooseFirstFreeSlot()
    fireEvent.click(submitButton())

    await waitFor(() => expect(screen.getByRole('status').textContent).toContain(rescheduleMessages.rescheduled))
    expect(mockReschedule).toHaveBeenCalledWith({
      appointmentId: APPOINTMENT_ID,
      newStartsAtMs: FREE_STARTS_AT_MS,
      expectedStatus: 'approved',
    })
    expect(screen.getByRole('link', { name: copy.backToAppointments }).getAttribute('href')).toBe(MY_APPOINTMENTS_PATH)
    expect(screen.queryByRole('radio')).toBeNull()
  })

  it('si la base lo rechaza muestra el mensaje y deja elegir otro espacio', async () => {
    mockReschedule.mockResolvedValue({ ok: false, message: rescheduleMessages.slotTaken })
    render(<RescheduleForm view={view} />)
    chooseFirstFreeSlot()
    fireEvent.click(submitButton())

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(rescheduleMessages.slotTaken))
    fireEvent.click(screen.getAllByRole('radio')[2])
    expect(screen.queryByRole('alert')).toBeNull()
    expect(submitButton().disabled).toBe(false)
  })

  it('si la acción lanza muestra el mensaje genérico, sin romper la pantalla', async () => {
    mockReschedule.mockImplementation(async () => {
      throw new Error('network')
    })
    render(<RescheduleForm view={view} />)
    chooseFirstFreeSlot()
    fireEvent.click(submitButton())

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain(rescheduleMessages.failed))
  })

  it('mientras envía no deja confirmar dos veces', async () => {
    mockReschedule.mockImplementation(() => new Promise(() => undefined))
    render(<RescheduleForm view={view} />)
    chooseFirstFreeSlot()
    fireEvent.click(submitButton())

    await waitFor(() => expect(screen.getByRole('button', { name: copy.submitting })).toBeTruthy())
    expect((screen.getByRole('button', { name: copy.submitting }) as HTMLButtonElement).disabled).toBe(true)
    expect(mockReschedule).toHaveBeenCalledTimes(1)
  })
})
