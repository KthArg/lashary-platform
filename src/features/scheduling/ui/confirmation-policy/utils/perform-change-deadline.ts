import type { Result } from '@/shared/result'
import type { ChangeConfirmationDeadlineError } from '@/features/scheduling/application/confirm-appointment'
import { MAX_CONFIRMATION_DEADLINE_HOURS } from '@/features/scheduling/domain/appointment-confirmation.constants'
import { CONFIRMATION_DEADLINE_FIELD, confirmationPolicyMessages } from '../constants/confirmation-policy-strings'
import { confirmationDeadlineFormSchema } from '../validation/confirmation-deadline-form-schema'
import { toChangeDeadlineErrorState } from './change-deadline-error-message'
import type { ConfirmationPolicyActionState } from '../types/confirmation-policy.types'

export type ChangeDeadlineDeps = {
  change: (hours: number) => Promise<Result<number, ChangeConfirmationDeadlineError>>
}

export async function performChangeConfirmationDeadline(
  rawFields: Record<string, unknown>,
  deps: ChangeDeadlineDeps,
): Promise<ConfirmationPolicyActionState> {
  const parsed = confirmationDeadlineFormSchema.safeParse(rawFields)
  if (!parsed.success) {
    return { status: 'invalid', message: confirmationPolicyMessages.invalid(MAX_CONFIRMATION_DEADLINE_HOURS) }
  }

  const changed = await deps.change(Number(parsed.data[CONFIRMATION_DEADLINE_FIELD]))
  if (!changed.ok) return toChangeDeadlineErrorState(changed.error)
  return { status: 'ok', message: confirmationPolicyMessages.saved(changed.value) }
}
