import { err, isErr, ok, type Result } from '@/shared/result'
import { checkCancellationWindowHours } from '../domain/cancellation-window'
import {
  auditNotRecorded,
  type AuditNotRecorded,
  type InvalidCancellationWindow,
  type StorageFailed,
} from '../domain/errors'
import {
  CANCELLATION_POLICY_ENTITY_ID,
  CANCELLATION_POLICY_ENTITY_TYPE,
  CANCELLATION_WINDOW_CHANGED_ACTION,
} from './cancellation-window.constants'
import type { CancellationPolicyRepository, RecordAuditEvent } from './ports'

export type ChangeCancellationWindowDeps = {
  policy: CancellationPolicyRepository
  recordAuditEvent: RecordAuditEvent
}

export type ChangeCancellationWindowInput = { actorId: string; hours: number }

export type ChangeCancellationWindowError = InvalidCancellationWindow | StorageFailed | AuditNotRecorded

export function getCancellationWindow(policy: CancellationPolicyRepository) {
  return function get(): Promise<Result<number, StorageFailed>> {
    return policy.getWindowHours()
  }
}

export async function changeCancellationWindow(
  deps: ChangeCancellationWindowDeps,
  input: ChangeCancellationWindowInput,
): Promise<Result<number, ChangeCancellationWindowError>> {
  const checked = checkCancellationWindowHours(input.hours)
  if (isErr(checked)) return err(checked.error)

  const previous = await deps.policy.getWindowHours()
  if (isErr(previous)) return err(previous.error)
  if (previous.value === checked.value) return ok(checked.value)

  const saved = await deps.policy.setWindowHours(checked.value)
  if (isErr(saved)) return err(saved.error)

  const audited = await deps.recordAuditEvent({
    actorId: input.actorId,
    action: CANCELLATION_WINDOW_CHANGED_ACTION,
    entityType: CANCELLATION_POLICY_ENTITY_TYPE,
    entityId: CANCELLATION_POLICY_ENTITY_ID,
    payload: { previousHours: previous.value, newHours: checked.value },
  })
  if (isErr(audited)) return err(auditNotRecorded())

  return ok(checked.value)
}
