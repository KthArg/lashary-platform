import { err, type Result } from '@/shared/result'
import { clientHasActiveDelinquency, type ClientHasActiveDelinquency } from '../domain/errors'
import type {
  BookAppointmentError,
  BookAppointmentInput,
  BookedAppointment,
  BookingRepository,
  DelinquencyPort,
} from './ports'

export type BookAppointmentDeps = {
  bookings: BookingRepository
  delinquency: DelinquencyPort
}

export type BookAppointmentFailure = BookAppointmentError | ClientHasActiveDelinquency

export function bookAppointment({ bookings, delinquency }: BookAppointmentDeps) {
  return async function book(
    input: BookAppointmentInput,
  ): Promise<Result<BookedAppointment, BookAppointmentFailure>> {
    if (await delinquency.hasActiveDelinquency()) return err(clientHasActiveDelinquency())
    return bookings.book(input)
  }
}
