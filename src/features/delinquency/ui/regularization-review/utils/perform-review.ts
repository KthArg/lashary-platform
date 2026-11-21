import { z } from 'zod'
import type { Result } from '@/shared/result'
import { DELINQUENCY_ERROR_CODES } from '@/features/delinquency/domain/errors'
import type { AccountCaseState } from '@/features/delinquency/domain/regularization'
import type { ReviewRegularizationFailure } from '@/features/delinquency/application/ports'
import { decisionMessages, reviewRefusalMessages } from '../constants/queue-strings'
import type { ReviewActionResult } from '../types/review-results'

export type ReviewDeps = {
  approve: (input: { requestId: string; approvedAmount: number }) => Promise<Result<AccountCaseState, ReviewRegularizationFailure>>
  reject: (input: { requestId: string; reason: string }) => Promise<Result<void, ReviewRegularizationFailure>>
}

const requestIdSchema = z.string().guid()
// El formulario manda texto: el monto llega como cadena y se exige entero (los colones no tienen decimales).
const amountSchema = z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER))

const messageFor = (error: ReviewRegularizationFailure): string =>
  error.code === DELINQUENCY_ERROR_CODES.reviewRefused ? reviewRefusalMessages[error.reason] : decisionMessages.saveFailed

export async function performApprove(fields: { requestId: unknown; approvedAmount: unknown }, deps: ReviewDeps): Promise<ReviewActionResult> {
  const requestId = requestIdSchema.safeParse(fields.requestId)
  if (!requestId.success) return { ok: false, message: decisionMessages.invalidInput }
  const amount = amountSchema.safeParse(fields.approvedAmount)
  if (!amount.success) return { ok: false, message: reviewRefusalMessages['approved-amount-invalid'] }

  const approved = await deps.approve({ requestId: requestId.data, approvedAmount: amount.data })
  if (!approved.ok) return { ok: false, message: messageFor(approved.error) }
  return { ok: true, message: approved.value === 'settled' ? decisionMessages.approvedSettled : decisionMessages.approvedPartial }
}

export async function performReject(fields: { requestId: unknown; reason: unknown }, deps: ReviewDeps): Promise<ReviewActionResult> {
  const requestId = requestIdSchema.safeParse(fields.requestId)
  if (!requestId.success) return { ok: false, message: decisionMessages.invalidInput }
  if (typeof fields.reason !== 'string') return { ok: false, message: reviewRefusalMessages['rejection-reason-required'] }

  const rejected = await deps.reject({ requestId: requestId.data, reason: fields.reason })
  if (!rejected.ok) return { ok: false, message: messageFor(rejected.error) }
  return { ok: true, message: decisionMessages.rejected }
}
