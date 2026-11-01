import type { Result } from '@/shared/result'
import type {
  AppointmentClosingRepository,
  CloseAppointmentError,
  CloseAppointmentInput,
  ClosedAppointment,
} from './closing-ports'

export function closeAppointment(closings: AppointmentClosingRepository) {
  return function close(input: CloseAppointmentInput): Promise<Result<ClosedAppointment, CloseAppointmentError>> {
    return closings.close(input)
  }
}
