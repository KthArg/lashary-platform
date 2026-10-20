import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { bookingConfirmMessages } from '../constants/booking-confirm-strings'
import { BookingConfirmView } from '../components/BookingConfirmView'
import type { BookingConfirmView as BookingConfirmViewModel } from '../types/booking-confirm.types'

vi.mock('../actions/book-appointment-action', () => ({ bookAppointmentAction: vi.fn() }))

afterEach(cleanup)

const BACK_HREF = '/portal/citas/calendario?servicio=t1&fecha=2026-10-20'
const fields = { serviceKey: 't1', date: '2026-10-20', startMin: 540 }
const summary = {
  service: 'Clásicas — primera vez',
  when: 'Martes 20 de octubre · 09:00–10:00',
  duration: '60 min',
  price: '₡35.000',
  deposit: '₡10.000',
  depositNotice: bookingConfirmMessages.depositNotice,
  promotionNotice: null,
}

const renderView = (view: BookingConfirmViewModel) => render(<BookingConfirmView view={view} />)

describe('BookingConfirmView — US-AGE-05', () => {
  it('muestra el resumen y la advertencia del anticipo antes de confirmar (criterio 7)', () => {
    renderView({ status: 'ready', fields, summary, backHref: BACK_HREF })

    expect(screen.getByText('Clásicas — primera vez')).toBeTruthy()
    expect(screen.getByText('₡10.000')).toBeTruthy()
    expect(screen.getByRole('note').textContent).toContain(bookingConfirmMessages.depositNotice)
    expect(screen.getByRole('link', { name: bookingConfirmMessages.changeSlot }).getAttribute('href')).toBe(BACK_HREF)
  })

  it('sin anticipo no muestra ninguna advertencia', () => {
    renderView({
      status: 'ready',
      fields,
      summary: { ...summary, deposit: bookingConfirmMessages.noDeposit, depositNotice: null },
      backHref: BACK_HREF,
    })

    expect(screen.getByText(bookingConfirmMessages.noDeposit)).toBeTruthy()
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('con promoción vigente, avisa el descuento (US-PROM-01 criterio 2)', () => {
    renderView({
      status: 'ready',
      fields,
      summary: { ...summary, price: '₡28.000', promotionNotice: bookingConfirmMessages.promotionNotice(20) },
      backHref: BACK_HREF,
    })

    expect(screen.getAllByRole('note').map((note) => note.textContent)).toContain(
      bookingConfirmMessages.promotionNotice(20),
    )
  })

  it.each([
    ['invalid', bookingConfirmMessages.invalid],
    ['unavailable', bookingConfirmMessages.unavailable],
  ] as const)('estado %s: avisa y deja volver al calendario', (status, message) => {
    renderView({ status, backHref: BACK_HREF })

    expect(screen.getByRole('alert').textContent).toContain(message)
    expect(screen.getByRole('link', { name: bookingConfirmMessages.changeSlot }).getAttribute('href')).toBe(BACK_HREF)
  })

  it('quien no es clienta ve el acceso denegado', () => {
    renderView({ status: 'forbidden' })
    expect(screen.getByRole('alert').textContent).toContain(bookingConfirmMessages.accessDenied)
  })
})
