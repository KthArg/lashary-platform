'use server'

import { redirect } from 'next/navigation'
import { CLIENT_PORTAL_ROUTES } from '@/features/auth'
import { bookingService } from '../services/booking-service'
import { textFields } from '../utils/form-fields'
import type { BookingActionState } from '../types/booking-action-state'

export async function bookAppointmentAction(
  _previous: BookingActionState,
  formData: FormData,
): Promise<BookingActionState> {
  const outcome = await bookingService.book(textFields(formData))

  if (outcome.kind === 'retry') redirect(outcome.backHref)
  if (outcome.kind === 'failed') {
    return outcome.canRegularize
      ? { status: 'error', message: outcome.message, regularizeHref: CLIENT_PORTAL_ROUTES.cuenta }
      : { status: 'error', message: outcome.message }
  }
  return { status: 'booked', booked: outcome.booked }
}
