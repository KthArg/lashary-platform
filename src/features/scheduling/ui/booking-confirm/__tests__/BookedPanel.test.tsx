import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MY_APPOINTMENTS_PATH } from '../../my-appointments/constants/my-appointments-strings'
import { bookingConfirmMessages } from '../constants/booking-confirm-strings'
import { BookedPanel } from '../components/BookedPanel'

const booked = {
  status: bookingConfirmMessages.pendingApproval,
  summary: {
    service: 'Clásicas — primera vez',
    when: 'viernes, 10 de septiembre de 2027 · 09:00–10:00',
    duration: '60 min',
    price: '₡35.000',
    deposit: '₡10.000',
    depositNotice: null,
  },
}

describe('BookedPanel', () => {
  it('«Ir a mis citas» lleva a la pantalla de mis citas, no al selector de técnica', () => {
    render(<BookedPanel booked={booked} />)

    expect(screen.getByRole('link', { name: bookingConfirmMessages.backToCitas }).getAttribute('href')).toBe(
      MY_APPOINTMENTS_PATH,
    )
  })

  it('muestra el estado pendiente de aprobación', () => {
    render(<BookedPanel booked={booked} />)

    expect(screen.getByRole('status').textContent).toBe(bookingConfirmMessages.pendingApproval)
  })
})
