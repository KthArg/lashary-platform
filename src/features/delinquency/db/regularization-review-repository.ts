import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { err, ok } from '@/shared/result'
import { delinquencyStorageFailed, reviewRefused } from '../domain/errors'
import { ACCOUNT_CASE_STATES, type ReviewRefusal } from '../domain/regularization'
import type { RegularizationReviewRepository } from '../application/ports'
import { UNEXPECTED_ROW } from './case-row'

export const APPROVE_REGULARIZATION_FUNCTION = 'delinquency_approve_regularization'
export const REJECT_REGULARIZATION_FUNCTION = 'delinquency_reject_regularization'

// El mensaje del RAISE de las funciones de la base y el motivo que entiende la aplicación.
export const REVIEW_REFUSALS: Readonly<Record<string, ReviewRefusal>> = {
  delinquency_regularization_not_found: 'request-not-found',
  delinquency_regularization_not_pending: 'request-not-pending',
  delinquency_approved_amount_invalid: 'approved-amount-invalid',
  delinquency_rejection_reason_required: 'rejection-reason-required',
}

const caseStateSchema = z.enum(ACCOUNT_CASE_STATES)

const toFailure = (message: string) => {
  const refusal = REVIEW_REFUSALS[message]
  return refusal ? reviewRefused(refusal) : delinquencyStorageFailed(message)
}

// Con la sesión de la administradora: las funciones de la base exigen administradora, asientan el pago y dejan la
// bitácora en la misma transacción (DOM-011).
export function regularizationReviewRepository(db: SupabaseClient): RegularizationReviewRepository {
  return {
    async approve(requestId, approvedAmount) {
      const { data, error } = await db.rpc(APPROVE_REGULARIZATION_FUNCTION, {
        p_request_id: requestId,
        p_approved_amount: approvedAmount,
      })
      if (error) return err(toFailure(error.message))
      const parsed = caseStateSchema.safeParse(data)
      if (!parsed.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      return ok(parsed.data)
    },

    async reject(requestId, reason) {
      const { error } = await db.rpc(REJECT_REGULARIZATION_FUNCTION, { p_request_id: requestId, p_reason: reason })
      if (error) return err(toFailure(error.message))
      return ok(undefined)
    },
  }
}
