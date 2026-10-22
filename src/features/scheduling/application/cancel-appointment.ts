import type { Result } from '@/shared/result'
import type {
  CancellationError,
  CancellationQuote,
  CancellationRepository,
  CancelledAppointment,
} from './ports'

export function quoteCancellation(cancellations: CancellationRepository) {
  return function quote(appointmentId: string): Promise<Result<CancellationQuote, CancellationError>> {
    return cancellations.quote(appointmentId)
  }
}

export function cancelAppointment(cancellations: CancellationRepository) {
  return function cancel(
    appointmentId: string,
  ): Promise<Result<CancelledAppointment, CancellationError>> {
    return cancellations.cancel(appointmentId)
  }
}
