import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { err, ok } from '@/shared/result'
import { delinquencyStorageFailed, notAClient, regularizationRefused } from '../domain/errors'
import {
  ACCOUNT_CASE_STATES,
  REQUEST_STATES,
  type AccountEntry,
  type RegularizationRefusal,
} from '../domain/regularization'
import type { RegularizationRepository } from '../application/ports'
import { UNEXPECTED_ROW } from './case-row'

export const SUBMIT_REGULARIZATION_FUNCTION = 'delinquency_submit_regularization'
export const MY_ACCOUNT_FUNCTION = 'delinquency_my_account'

const NOT_A_CLIENT_MESSAGE = 'delinquency_not_a_client'

export const SUBMIT_REFUSALS: Readonly<Record<string, RegularizationRefusal>> = {
  delinquency_case_not_regularizable: 'case-not-regularizable',
  delinquency_case_already_paid: 'case-already-paid',
  delinquency_declared_amount_invalid: 'declared-amount-invalid',
  delinquency_reference_too_long: 'reference-too-long',
  delinquency_receipt_not_found: 'receipt-not-found',
  delinquency_receipt_already_used: 'receipt-already-used',
}

const requestIdSchema = z.string().guid()

const accountRowSchema = z.object({
  case_id: z.string().guid(),
  case_state: z.enum(ACCOUNT_CASE_STATES),
  appointment_id: z.string().guid(),
  pending: z.number().int(),
  since: z.string(),
  request_id: z.string().guid().nullable(),
  request_state: z.enum(REQUEST_STATES).nullable(),
  declared_amount: z.number().int().nullable(),
  approved_amount: z.number().int().nullable(),
  rejection_reason: z.string().nullable(),
  reviewed_at: z.string().nullable(),
})

type AccountRow = z.infer<typeof accountRowSchema>

function toAccountEntry(row: AccountRow): AccountEntry {
  return {
    caseId: row.case_id,
    caseState: row.case_state,
    appointmentId: row.appointment_id,
    pending: row.pending,
    since: new Date(row.since),
    request:
      row.request_id && row.request_state && row.declared_amount !== null
        ? {
            id: row.request_id,
            state: row.request_state,
            declaredAmount: row.declared_amount,
            approvedAmount: row.approved_amount,
            rejectionReason: row.rejection_reason,
            reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
          }
        : null,
  }
}

export function regularizationRepository(db: SupabaseClient): RegularizationRepository {
  return {
    async submit(input) {
      const { data, error } = await db.rpc(SUBMIT_REGULARIZATION_FUNCTION, {
        p_case_id: input.caseId,
        p_declared_amount: input.declaredAmount,
        p_reference: input.reference,
        p_receipt_path: input.receiptPath,
      })
      if (error) {
        if (error.message === NOT_A_CLIENT_MESSAGE) return err(notAClient())
        const refusal = SUBMIT_REFUSALS[error.message]
        return err(refusal ? regularizationRefused(refusal) : delinquencyStorageFailed(error.message))
      }
      const parsed = requestIdSchema.safeParse(data)
      if (!parsed.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      return ok(parsed.data)
    },

    async myAccount() {
      const { data, error } = await db.rpc(MY_ACCOUNT_FUNCTION)
      if (error) return err(delinquencyStorageFailed(error.message))
      const parsed = z.array(accountRowSchema).safeParse(data)
      if (!parsed.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      return ok(parsed.data.map(toAccountEntry))
    },
  }
}
