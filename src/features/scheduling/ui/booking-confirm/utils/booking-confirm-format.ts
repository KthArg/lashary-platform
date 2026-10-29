import { moneyFromColones, formatMoney } from '@/shared/money'
import { formatCalendarDate, minutesToTime } from '../../availability/utils/availability-format'
import { bookingConfirmMessages } from '../constants/booking-confirm-strings'
import type { BookingConfirmData, BookingConfirmView, BookingSummaryView } from '../types/booking-confirm.types'

const money = (colones: number): string => formatMoney(moneyFromColones(colones))

export type SummaryInput = {
  serviceName: string
  isFirstTime: boolean
  date: string
  startMin: number
  durationMin: number
  price: number
  depositDue: number
}

export function toBookingSummary(input: SummaryInput): BookingSummaryView {
  const copy = bookingConfirmMessages
  const hasDeposit = input.depositDue > 0
  return {
    service: copy.service(input.serviceName, input.isFirstTime),
    when: `${formatCalendarDate(input.date)} · ${minutesToTime(input.startMin)}–${minutesToTime(input.startMin + input.durationMin)}`,
    duration: copy.duration(input.durationMin),
    price: money(input.price),
    deposit: hasDeposit ? money(input.depositDue) : copy.noDeposit,
    depositNotice: hasDeposit ? copy.depositNotice : null,
  }
}

export function toBookingConfirmView(data: BookingConfirmData): BookingConfirmView {
  if (data.status !== 'ready') return data

  const { params, quote } = data
  return {
    status: 'ready',
    fields: params,
    backHref: data.backHref,
    summary: toBookingSummary({
      serviceName: data.serviceName,
      isFirstTime: data.isFirstTime,
      date: params.date,
      startMin: params.startMin,
      durationMin: quote.durationMin,
      price: quote.servicePrice,
      depositDue: quote.depositDue,
    }),
  }
}
