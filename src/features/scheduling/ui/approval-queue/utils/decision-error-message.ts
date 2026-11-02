import type { DecideAppointmentError } from '../../../application/decide-appointment'
import { formatAppointmentSlot } from '../../appointment-display/utils/format-appointment-slot'
import { DECISION_ERROR_MESSAGES, scheduleChangedMessage } from '../constants/approval-queue.constants'

export function getDecisionErrorMessage(error: DecideAppointmentError): string {
  if (error.code === 'SCHEDULING_APPOINTMENT_SCHEDULE_CHANGED') {
    return scheduleChangedMessage(formatAppointmentSlot(error.startsAtMs, error.endsAtMs))
  }
  return DECISION_ERROR_MESSAGES[error.code]
}
