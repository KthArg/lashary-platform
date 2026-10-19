import { Money } from '@/shared/money'
import { formatCalendarDate, minutesToTime } from '../../availability/utils/availability-format'
import { bookingConfirmMessages, CANCELLATION_WINDOW_HOURS } from '../constants/booking-confirm-strings'
import type { BookingConfirmData, BookingConfirmView } from '../types/booking-confirm.types'

const money = (colones: number): string => Money.fromColones(colones).toString()

export function toBookingConfirmView(data: BookingConfirmData): BookingConfirmView {
  const copy = bookingConfirmMessages
  if (data.status !== 'ready') return data

  const { params, quote } = data
  const hasDeposit = quote.depositDue > 0
  return {
    status: 'ready',
    backHref: data.backHref,
    summary: {
      service: copy.service(data.serviceName, data.isFirstTime),
      when: `${formatCalendarDate(params.date)} · ${minutesToTime(params.startMin)}–${minutesToTime(params.startMin + quote.durationMin)}`,
      duration: copy.duration(quote.durationMin),
      price: money(quote.servicePrice),
      deposit: hasDeposit ? money(quote.depositDue) : copy.noDeposit,
      depositNotice: hasDeposit ? copy.depositNotice(CANCELLATION_WINDOW_HOURS) : null,
    },
  }
}
