import { describe, it, expect } from 'vitest'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { formatMoney, moneyFromColones } from '@/shared/money'
import { formatStudioDateTime } from '@/shared/studio-time'
import type { AppointmentCancelledNotice, AppointmentRescheduledNotice, BookingCreatedNotice } from '@/features/notifications/domain/inbox-notice'
import { INBOX_TEXTS } from '../constants/inbox-strings'
import { noticeLines } from '../utils/notice-lines'

const booking: BookingCreatedNotice = {
  id: 'aviso-1',
  kind: 'booking_created',
  appointmentId: 'cita-1',
  clientName: 'Ana Pérez',
  serviceName: 'Lifting de pestañas',
  startsAt: fixedDate('2026-11-05T15:00:00Z'),
  readAt: null,
  createdAt: fixedDate('2026-10-29T18:00:00Z'),
}
const cancelled: AppointmentCancelledNotice = { ...booking, kind: 'appointment_cancelled', forfeitedDeposit: 10000 }
const rescheduled: AppointmentRescheduledNotice = {
  ...booking,
  kind: 'appointment_rescheduled',
  previousStartsAt: fixedDate('2026-11-04T15:00:00Z'),
}

describe('noticeLines', () => {
  it('una reserva dice quién reservó, el servicio y la hora (US-NOT-01)', () => {
    expect(noticeLines(booking)).toEqual({
      title: INBOX_TEXTS.bookingCreated('Ana Pérez'),
      details: ['Lifting de pestañas', formatStudioDateTime(booking.startsAt)],
    })
  })

  it('una cancelación dice quién canceló, qué cita y cuánto anticipo perdió (US-NOT-02, criterios 1 y 2)', () => {
    expect(noticeLines(cancelled)).toEqual({
      title: INBOX_TEXTS.appointmentCancelled('Ana Pérez'),
      details: [
        'Lifting de pestañas',
        formatStudioDateTime(cancelled.startsAt),
        INBOX_TEXTS.depositForfeited(formatMoney(moneyFromColones(10000))),
      ],
    })
  })

  it('una cancelación sin pérdida dice que no perdió el anticipo, no que perdió ₡0 (criterio 2)', () => {
    expect(noticeLines({ ...cancelled, forfeitedDeposit: 0 }).details.at(-1)).toBe(INBOX_TEXTS.depositKept)
  })

  it('un reagendado muestra el horario anterior y el nuevo, que queda por aprobar (US-NOT-02, criterios 1 y 3)', () => {
    expect(noticeLines(rescheduled)).toEqual({
      title: INBOX_TEXTS.appointmentRescheduled('Ana Pérez'),
      details: [
        'Lifting de pestañas',
        INBOX_TEXTS.previousSchedule(formatStudioDateTime(rescheduled.previousStartsAt)),
        INBOX_TEXTS.newSchedule(formatStudioDateTime(rescheduled.startsAt)),
      ],
    })
  })
})
