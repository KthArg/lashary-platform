import { err, isErr, type Result } from '@/shared/result'
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
    // El bloqueo por morosidad lo aplica la base dentro de la reserva (SEC-001): una clienta bloqueada recibe el
    // mismo rechazo que un espacio ocupado. Si la reserva falla así, se pregunta si fue por morosidad para
    // decirle cuánto debe y de qué cita; si la pregunta falla o no hay bloqueo, queda el rechazo original.
    const result = await bookings.book(input)
    if (result.ok || result.error.code !== 'SCHEDULING_SPACE_NOT_AVAILABLE') return result
    const block = await delinquency.activeBlock()
    if (isErr(block) || block.value === null) return result
    return err(clientHasActiveDelinquency(block.value))
  }
}
