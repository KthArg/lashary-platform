import type { ChangeConfirmationDeadlineError } from '@/features/scheduling/application/confirm-appointment'
import { MAX_CONFIRMATION_DEADLINE_HOURS } from '@/features/scheduling/domain/appointment-confirmation.constants'
import { confirmationPolicyMessages } from '../constants/confirmation-policy-strings'
import type { ConfirmationPolicyActionState } from '../types/confirmation-policy.types'

export function toChangeDeadlineErrorState(error: ChangeConfirmationDeadlineError): ConfirmationPolicyActionState {
  switch (error.code) {
    case 'SCHEDULING_INVALID_CONFIRMATION_DEADLINE':
      return { status: 'invalid', message: confirmationPolicyMessages.invalid(MAX_CONFIRMATION_DEADLINE_HOURS) }
    case 'SCHEDULING_STORAGE_FAILED':
      return { status: 'failed', message: confirmationPolicyMessages.failed }
  }
}
