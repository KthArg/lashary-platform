import type { ChangeCancellationWindowError } from '../../../application/cancellation-window'
import { MAX_CANCELLATION_WINDOW_HOURS } from '../../../domain/cancellation-window.constants'
import { cancellationPolicyMessages } from '../constants/cancellation-policy-strings'
import type { CancellationPolicyActionState } from '../types/cancellation-policy.types'

export function toChangeWindowErrorState(error: ChangeCancellationWindowError): CancellationPolicyActionState {
  switch (error.code) {
    case 'SCHEDULING_INVALID_CANCELLATION_WINDOW':
      return { status: 'invalid', message: cancellationPolicyMessages.invalid(MAX_CANCELLATION_WINDOW_HOURS) }
    case 'SCHEDULING_STORAGE_FAILED':
      return { status: 'failed', message: cancellationPolicyMessages.failed }
  }
}
