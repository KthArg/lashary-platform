import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { clientCalendarMessages } from '../../client-calendar/constants/client-calendar-strings'
import { MY_APPOINTMENTS_PATH } from '../../my-appointments/constants/my-appointments-strings'
import { RescheduleView } from '../components/RescheduleView'
import { reschedulePageMessages, reschedulePath } from '../constants/reschedule-page-strings'
import type { RescheduleView as RescheduleViewModel } from '../types/reschedule-view.types'

const copy = reschedulePageMessages
const APPOINTMENT_ID = 'cita-1'
const CURRENT = 'Clásicas · viernes, 10 de septiembre de 2027 · 9:00 a. m. – 10:00 a. m.'
const day = {
  title: 'Lunes 6 de septiembre',
  previousHref: null,
  nextHref: reschedulePath(APPOINTMENT_ID, '2027-09-07'),
}

afterEach(cleanup)

describe('RescheduleView', () => {
  it('el título identifica la pantalla y explica que la administradora tiene que aprobar de nuevo', () => {
    render(<RescheduleView view={{ status: 'forbidden' }} />)

    expect(screen.getByRole('heading', { level: 1, name: copy.title })).toBeTruthy()
    expect(screen.getByText(copy.subtitle)).toBeTruthy()
  })

  it('sin sesión de clienta avisa con una alerta', () => {
    render(<RescheduleView view={{ status: 'forbidden' }} />)

    expect(screen.getByRole('alert').textContent).toContain(copy.accessDenied)
  })

  it.each([
    ['notReschedulable', copy.notReschedulable],
    ['failed', copy.failed],
  ] as const)('%s avisa y ofrece volver a mis citas', (status, message) => {
    render(<RescheduleView view={{ status }} />)

    expect(screen.getByRole('alert').textContent).toContain(message)
    expect(screen.getByRole('link', { name: copy.backToAppointments }).getAttribute('href')).toBe(MY_APPOINTMENTS_PATH)
  })

  it('una cita bloqueada muestra la cita actual y el motivo, sin espacios', () => {
    render(<RescheduleView view={{ status: 'blocked', current: CURRENT, message: copy.limitReached(1) }} />)

    expect(screen.getByText(CURRENT)).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toContain(copy.limitReached(1))
    expect(screen.queryByRole('radio')).toBeNull()
    expect(screen.getByRole('link', { name: copy.backToAppointments })).toBeTruthy()
  })

  it('con espacios: la cita actual, los reagendados que quedan, el día y los espacios libres y ocupados', () => {
    render(
      <RescheduleView
        view={{
          status: 'ready',
          current: CURRENT,
          remaining: copy.remaining(1),
          day,
          slots: [
            { startMin: 540, range: '09:00–10:15', busy: false },
            { startMin: 570, range: '09:30–10:45', busy: true },
          ],
        }}
      />,
    )

    expect(screen.getByText(CURRENT)).toBeTruthy()
    expect(screen.getByText(copy.remaining(1))).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: day.title })).toBeTruthy()

    const [free, busy] = screen.getAllByRole('radio') as HTMLInputElement[]
    expect(free.disabled).toBe(false)
    expect(busy.disabled).toBe(true)
    expect(within(free.closest('label') as HTMLElement).getByText(clientCalendarMessages.free)).toBeTruthy()
    expect(within(busy.closest('label') as HTMLElement).getByText(clientCalendarMessages.busy)).toBeTruthy()
  })

  it('un día sin espacios lo dice', () => {
    render(<RescheduleView view={{ status: 'ready', current: CURRENT, remaining: copy.remaining(1), day, slots: [] }} />)

    expect(screen.getByText(clientCalendarMessages.noSlots)).toBeTruthy()
    expect(screen.queryByRole('radio')).toBeNull()
  })

  it('si no se pueden calcular los espacios avisa y deja cambiar de día', () => {
    render(<RescheduleView view={{ status: 'invalid', current: CURRENT, day }} />)

    expect(screen.getByRole('alert').textContent).toContain(clientCalendarMessages.invalid)
    expect(screen.getByRole('link', { name: clientCalendarMessages.nextDay }).getAttribute('href')).toBe(day.nextHref)
  })
})
