import { err, isErr, ok, type Result } from '@/shared/result'
import { checkRescheduleLimit } from '../domain/reschedule-limit'
import type { InvalidRescheduleLimit, StorageFailed } from '../domain/errors'
import type { ReschedulePolicyRepository } from './ports'

export type ChangeRescheduleLimitError = InvalidRescheduleLimit | StorageFailed

export function getRescheduleLimit(policy: ReschedulePolicyRepository) {
  return function get(): Promise<Result<number, StorageFailed>> {
    return policy.getMaxReschedules()
  }
}

export function changeRescheduleLimit(policy: ReschedulePolicyRepository) {
  return async function change(max: number): Promise<Result<number, ChangeRescheduleLimitError>> {
    const checked = checkRescheduleLimit(max)
    if (isErr(checked)) return err(checked.error)

    const changed = await policy.changeMaxReschedules(checked.value)
    if (isErr(changed)) return err(changed.error)
    return ok(changed.value.newMax)
  }
}
