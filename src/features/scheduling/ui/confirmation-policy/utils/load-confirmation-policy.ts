import { isErr } from '@/shared/result'
import type { Result } from '@/shared/result'
import type { StorageFailed } from '@/features/scheduling/domain/errors'
import type { ConfirmationPolicyScreen } from '../types/confirmation-policy.types'

export type LoadConfirmationPolicyDeps = {
  getDeadlineHours: () => Promise<Result<number, StorageFailed>>
}

export async function loadConfirmationPolicy(deps: LoadConfirmationPolicyDeps): Promise<ConfirmationPolicyScreen> {
  const result = await deps.getDeadlineHours()
  if (isErr(result)) return { status: 'error' }
  return { status: 'ready', hours: result.value }
}
