import type { CancellationError } from '../../../application/ports'
import { cancellationMessages } from '../constants/cancellation-strings'

const messagesByCode: Record<CancellationError['code'], string> = {
  SCHEDULING_CLIENT_NOT_REGISTERED: cancellationMessages.clientNotRegistered,
  SCHEDULING_APPOINTMENT_NOT_CANCELLABLE: cancellationMessages.notCancellable,
  SCHEDULING_CANCELLATION_CONSEQUENCE_CHANGED: cancellationMessages.consequenceChanged,
  SCHEDULING_STORAGE_FAILED: cancellationMessages.failed,
}

export function getCancellationErrorMessage(error: CancellationError): string {
  return messagesByCode[error.code]
}
