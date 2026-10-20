import { useActionState } from 'react'
import { bookAppointmentAction } from '../actions/book-appointment-action'
import { INITIAL_BOOKING_ACTION_STATE } from '../types/booking-action-state'

export function useBookingConfirm() {
  const [state, formAction, isPending] = useActionState(bookAppointmentAction, INITIAL_BOOKING_ACTION_STATE)
  return { state, formAction, isPending }
}
