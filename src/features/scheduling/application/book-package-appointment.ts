import { err, type Result } from '@/shared/result'
import { clientHasActiveDelinquency, type ClientHasActiveDelinquency } from '../domain/errors'
import type {
  BookPackageAppointmentError,
  BookPackageAppointmentInput,
  BookedPackageAppointment,
  DelinquencyPort,
  PackageBookingRepository,
} from './ports'

export type BookPackageAppointmentDeps = {
  bookings: PackageBookingRepository
  delinquency: DelinquencyPort
}

export type BookPackageAppointmentFailure = BookPackageAppointmentError | ClientHasActiveDelinquency

export function bookPackageAppointment({ bookings, delinquency }: BookPackageAppointmentDeps) {
  return async function book(
    input: BookPackageAppointmentInput,
  ): Promise<Result<BookedPackageAppointment, BookPackageAppointmentFailure>> {
    if (await delinquency.hasActiveDelinquency()) return err(clientHasActiveDelinquency())
    return bookings.book(input)
  }
}
