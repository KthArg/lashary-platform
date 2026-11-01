import type { RescheduleError } from '../../../application/ports'
import { rescheduleMessages } from '../constants/reschedule-strings'

const messagesByCode: Record<RescheduleError['code'], string> = {
  SCHEDULING_CLIENT_NOT_REGISTERED: rescheduleMessages.clientNotRegistered,
  SCHEDULING_APPOINTMENT_NOT_RESCHEDULABLE: rescheduleMessages.notReschedulable,
  SCHEDULING_RESCHEDULE_OUTSIDE_WINDOW: rescheduleMessages.outsideWindow,
  SCHEDULING_RESCHEDULE_LIMIT_REACHED: rescheduleMessages.limitReached,
  SCHEDULING_RESCHEDULE_STATE_CHANGED: rescheduleMessages.stateChanged,
  SCHEDULING_RESCHEDULE_SLOT_NOT_OFFERED: rescheduleMessages.slotNotOffered,
  SCHEDULING_RESCHEDULE_SLOT_TAKEN: rescheduleMessages.slotTaken,
  SCHEDULING_TOO_MANY_PENDING_APPOINTMENTS: rescheduleMessages.tooManyPending,
  SCHEDULING_STORAGE_FAILED: rescheduleMessages.failed,
}

export function getRescheduleErrorMessage(error: RescheduleError): string {
  return messagesByCode[error.code]
}
