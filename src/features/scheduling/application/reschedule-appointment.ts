import type { Result } from '@/shared/result'
import type {
  RescheduledAppointment,
  RescheduleError,
  RescheduleInput,
  RescheduleQuote,
  RescheduleQuoteError,
  RescheduleRepository,
} from './ports'

export function quoteReschedule(reschedules: RescheduleRepository) {
  return function quote(appointmentId: string): Promise<Result<RescheduleQuote, RescheduleQuoteError>> {
    return reschedules.quote(appointmentId)
  }
}

export function rescheduleAppointment(reschedules: RescheduleRepository) {
  return function reschedule(input: RescheduleInput): Promise<Result<RescheduledAppointment, RescheduleError>> {
    return reschedules.reschedule(input)
  }
}
