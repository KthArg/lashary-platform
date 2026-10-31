import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import {
  BOOK_APPOINTMENT_PATH,
  MY_APPOINTMENTS_PATH,
  myAppointmentsMessages,
} from '../constants/my-appointments-strings'
import { MyAppointmentsView } from '../components/MyAppointmentsView'
import { reschedulePageMessages, reschedulePath } from '../../reschedule/constants/reschedule-page-strings'
import type { MyAppointmentView } from '../types/my-appointments.types'

const copy = myAppointmentsMessages

vi.mock('../actions/cancel-appointment-actions', () => ({
  quoteCancellationAction: vi.fn(),
  cancelAppointmentAction: vi.fn(),
}))

afterEach(cleanup)
const appointment: MyAppointmentView = {
  id: 'cita-1',
  service: 'Clásicas',
  kind: 'Primera vez',
  slot: 'viernes, 10 de septiembre de 2027 · 9:00 a. m. – 10:00 a. m.',
  status: copy.status.approved,
  amounts: 'Precio ₡35.000 · Anticipo ₡10.000',
}

describe('MyAppointmentsView', () => {
  it('con citas las lista, cada una con servicio, horario, estado y montos', () => {
    const second = { ...appointment, id: 'cita-2', kind: 'Retoque', status: copy.status.pending_approval, amounts: null }
    render(<MyAppointmentsView view={{ status: 'ready', appointments: [appointment, second] }} />)

    const items = within(screen.getByRole('list', { name: copy.listLabel })).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText('Clásicas')).toBeTruthy()
    expect(within(items[0]).getByText(appointment.slot)).toBeTruthy()
    expect(within(items[0]).getByText(copy.status.approved)).toBeTruthy()
    expect(within(items[0]).getByText(appointment.amounts as string)).toBeTruthy()
    expect(within(items[1]).getByText('Retoque')).toBeTruthy()
    expect(within(items[1]).getByText(copy.status.pending_approval)).toBeTruthy()
  })

  it('cada cita ofrece reagendar, con un enlace a su pantalla y un nombre que dice cuál cita es', () => {
    render(<MyAppointmentsView view={{ status: 'ready', appointments: [appointment] }} />)

    const link = screen.getByRole('link', { name: reschedulePageMessages.rescheduleButtonLabel(appointment.slot) })
    expect(link.getAttribute('href')).toBe(reschedulePath(appointment.id))
    expect(link.textContent).toBe(reschedulePageMessages.rescheduleButton)
  })

  it('el título identifica la pantalla', () => {
    render(<MyAppointmentsView view={{ status: 'empty' }} />)

    expect(screen.getByRole('heading', { level: 1, name: copy.title })).toBeTruthy()
  })

  it('sin citas lo dice y ofrece reservar una (UI-003)', () => {
    render(<MyAppointmentsView view={{ status: 'empty' }} />)

    expect(screen.getByText(copy.empty)).toBeTruthy()
    expect(screen.getByRole('link', { name: copy.bookCta }).getAttribute('href')).toBe(BOOK_APPOINTMENT_PATH)
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('si falló la carga avisa con role=alert y ofrece reintentar, sin decir que no hay citas (UI-003)', () => {
    render(<MyAppointmentsView view={{ status: 'error' }} />)

    expect(screen.getByRole('alert').textContent).toContain(copy.loadFailed)
    expect(screen.getByRole('link', { name: copy.reload }).getAttribute('href')).toBe(MY_APPOINTMENTS_PATH)
    expect(screen.queryByText(copy.empty)).toBeNull()
  })

  it('quien no es clienta ve el aviso de acceso y ninguna cita', () => {
    render(<MyAppointmentsView view={{ status: 'forbidden' }} />)

    expect(screen.getByRole('alert').textContent).toContain(copy.accessDenied)
    expect(screen.queryByRole('list')).toBeNull()
  })
})
