import { err, isErr, ok, type Result } from '@/shared/result'
import { checkCancellationWindowHours } from '../domain/cancellation-window'
import type { InvalidCancellationWindow, StorageFailed } from '../domain/errors'
import type { CancellationPolicyRepository } from './ports'

export type ChangeCancellationWindowError = InvalidCancellationWindow | StorageFailed

export function getCancellationWindow(policy: CancellationPolicyRepository) {
  return function get(): Promise<Result<number, StorageFailed>> {
    return policy.getWindowHours()
  }
}

export function changeCancellationWindow(policy: CancellationPolicyRepository) {
  return async function change(hours: number): Promise<Result<number, ChangeCancellationWindowError>> {
    const checked = checkCancellationWindowHours(hours)
    if (isErr(checked)) return err(checked.error)

    const changed = await policy.changeWindowHours(checked.value)
    if (isErr(changed)) return err(changed.error)
    return ok(changed.value.newHours)
  }
}
