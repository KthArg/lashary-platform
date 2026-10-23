import { isErr } from '@/shared/result'
import type { Result } from '@/shared/result'
import type { StorageFailed } from '../../../domain/errors'
import type { CancellationPolicyScreen } from '../types/cancellation-policy.types'

export type LoadCancellationPolicyDeps = {
  getWindowHours: () => Promise<Result<number, StorageFailed>>
}

export async function loadCancellationPolicy(deps: LoadCancellationPolicyDeps): Promise<CancellationPolicyScreen> {
  const result = await deps.getWindowHours()
  if (isErr(result)) return { status: 'error' }
  return { status: 'ready', hours: result.value }
}
