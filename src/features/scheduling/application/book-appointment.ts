import { err, isErr, type Result } from '@/shared/result'
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
