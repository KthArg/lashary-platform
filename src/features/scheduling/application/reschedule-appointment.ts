import type { Result } from '@/shared/result'
import type {
  RescheduledAppointment,
  RescheduleError,
  RescheduleInput,
  RescheduleRepository,
} from './ports'

export function rescheduleAppointment(reschedules: RescheduleRepository) {
  return function reschedule(input: RescheduleInput): Promise<Result<RescheduledAppointment, RescheduleError>> {
    return reschedules.reschedule(input)
  }
}
