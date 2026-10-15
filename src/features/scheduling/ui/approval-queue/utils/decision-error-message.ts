import type { DecideAppointmentError } from '../../../application/decide-appointment'
import { DECISION_ERROR_MESSAGES } from '../constants/approval-queue.constants'

export const getDecisionErrorMessage = (error: DecideAppointmentError): string =>
  DECISION_ERROR_MESSAGES[error.code]
