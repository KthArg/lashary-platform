import type { BookingSummaryView } from './booking-confirm.types'

export type BookedView = {
  summary: BookingSummaryView
  status: string
}

export type BookingActionState =
  | { status: 'idle' }
  | { status: 'booked'; booked: BookedView }
  | { status: 'error'; message: string }

export const INITIAL_BOOKING_ACTION_STATE: BookingActionState = { status: 'idle' }
