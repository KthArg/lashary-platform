import type { Result } from '@/shared/result'
import type { ChangeCancellationWindowError } from '../../../application/cancellation-window'
import { MAX_CANCELLATION_WINDOW_HOURS } from '../../../domain/cancellation-window.constants'
import { CANCELLATION_WINDOW_FIELD, cancellationPolicyMessages } from '../constants/cancellation-policy-strings'
import { cancellationWindowFormSchema } from '../validation/cancellation-window-form-schema'
import { toChangeWindowErrorState } from './change-window-error-message'
import type { CancellationPolicyActionState } from '../types/cancellation-policy.types'

export type ChangeWindowDeps = {
  currentActorId: () => Promise<string | null>
  change: (input: { actorId: string; hours: number }) => Promise<Result<number, ChangeCancellationWindowError>>
}

export async function performChangeCancellationWindow(
  rawFields: Record<string, unknown>,
  deps: ChangeWindowDeps,
): Promise<CancellationPolicyActionState> {
  const actorId = await deps.currentActorId()
  if (!actorId) return { status: 'forbidden', message: cancellationPolicyMessages.accessDenied }

  const parsed = cancellationWindowFormSchema.safeParse(rawFields)
  if (!parsed.success) {
    return { status: 'invalid', message: cancellationPolicyMessages.invalid(MAX_CANCELLATION_WINDOW_HOURS) }
  }

  const changed = await deps.change({ actorId, hours: Number(parsed.data[CANCELLATION_WINDOW_FIELD]) })
  if (!changed.ok) return toChangeWindowErrorState(changed.error)
  return { status: 'ok', message: cancellationPolicyMessages.saved(changed.value) }
}
