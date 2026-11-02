import { isErr } from '@/shared/result'
import type { Result } from '@/shared/result'
import type { StorageFailed } from '../../../domain/errors'
import type { ReschedulePolicyScreen } from '../types/reschedule-policy.types'

export type LoadReschedulePolicyDeps = {
  getMaxReschedules: () => Promise<Result<number, StorageFailed>>
}

export async function loadReschedulePolicy(deps: LoadReschedulePolicyDeps): Promise<ReschedulePolicyScreen> {
  const result = await deps.getMaxReschedules()
  if (isErr(result)) return { status: 'error' }
  return { status: 'ready', max: result.value }
}
