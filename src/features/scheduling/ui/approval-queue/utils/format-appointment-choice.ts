import type { AppointmentChoice } from '../../../application/ports'
import { formatAppointmentSummary } from '../../appointment-display/utils/format-appointment-summary'
import { APPROVAL_QUEUE_CHOICE } from '../constants/approval-queue.labels'
import type { AppointmentChoiceView } from '../types/approval-queue.types'

function toWarning(choice: AppointmentChoice): string | null {
  if (choice.detectedFirstTime === null || choice.detectedFirstTime === choice.isFirstTime) return null
  return choice.isFirstTime
    ? APPROVAL_QUEUE_CHOICE.chose.firstTimeButDetectedRetouch
    : APPROVAL_QUEUE_CHOICE.chose.retouchButDetectedFirstTime
}

export function formatAppointmentChoice(choice: AppointmentChoice | null): AppointmentChoiceView {
  return { ...formatAppointmentSummary(choice), warning: choice ? toWarning(choice) : null }
}
