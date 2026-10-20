import type { BookingQuote } from '../../../application/ports'
import type { CalendarSearchParams } from '../../client-calendar/types/client-calendar.types'

export type BookingConfirmSearchParams = CalendarSearchParams

export type ConfirmParams = {
  readonly serviceKey: string
  readonly date: string
  readonly startMin: number
}

export type BookingConfirmData =
  | { status: 'forbidden' }
  | { status: 'invalid'; backHref: string }
  | { status: 'unavailable'; backHref: string }
  | {
      status: 'ready'
      params: ConfirmParams
      serviceName: string
      isFirstTime: boolean
      quote: BookingQuote
      backHref: string
    }

export type BookingSummaryView = {
  service: string
  when: string
  duration: string
  price: string
  deposit: string
  depositNotice: string | null
  promotionNotice: string | null
}

export type BookingConfirmView =
  | { status: 'forbidden' }
  | { status: 'invalid'; backHref: string }
  | { status: 'unavailable'; backHref: string }
  | { status: 'ready'; fields: ConfirmParams; summary: BookingSummaryView; backHref: string }
