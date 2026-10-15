import { err, ok, type Result } from '@/shared/result'
import { MAX_DECISION_REASON_LENGTH } from './appointment-decision.constants'
import { invalidDecisionReason, type InvalidDecisionReason } from './errors'

export function normalizeDecisionReason(
  reason: string | undefined,
): Result<string | null, InvalidDecisionReason> {
  const trimmedReason = reason?.trim() ?? ''
  if (trimmedReason.length === 0) return ok(null)
  if (trimmedReason.length > MAX_DECISION_REASON_LENGTH) return err(invalidDecisionReason())
  return ok(trimmedReason)
}
