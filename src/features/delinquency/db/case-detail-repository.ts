import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { err, ok } from '@/shared/result'
import { CASE_STATES } from '../domain/delinquency-case'
import { REQUEST_STATES } from '../domain/regularization'
import { caseNotFound, delinquencyStorageFailed } from '../domain/errors'
import type { CaseDetailRepository } from '../application/ports'
import { CASES_TABLE } from './case-list-repository'
import { APPOINTMENT_BALANCES_FUNCTION, REGULARIZATIONS_TABLE } from './regularization-queue-repository'
import { UNEXPECTED_ROW } from './case-row'

export const REQUEST_DETAIL_COLUMNS =
  'id, state, declared_amount, reference, approved_amount, rejection_reason, created_at, reviewed_at'
export const CASE_DETAIL_COLUMNS = `id, client_id, appointment_id, pending, state, detected_at, decided_at, settled_at, exception_reason, exception_amount, ${REGULARIZATIONS_TABLE}(${REQUEST_DETAIL_COLUMNS})`

const requestRowSchema = z.object({
  id: z.string().guid(),
  state: z.enum(REQUEST_STATES),
  declared_amount: z.number().int().positive(),
  reference: z.string().nullable(),
  approved_amount: z.number().int().nullable(),
  rejection_reason: z.string().nullable(),
  created_at: z.string(),
  reviewed_at: z.string().nullable(),
})

const detailRowSchema = z.object({
  id: z.string().guid(),
  client_id: z.string().guid(),
  appointment_id: z.string().guid(),
  pending: z.number().int().positive(),
  state: z.enum(CASE_STATES),
  detected_at: z.string(),
  decided_at: z.string().nullable(),
  settled_at: z.string().nullable(),
  exception_reason: z.string().nullable(),
  exception_amount: z.number().int().positive().nullable(),
  delinquency_regularizations: z.array(requestRowSchema).default([]),
})

const balanceRowSchema = z.object({ appointment_id: z.string().guid(), pending: z.number().int() })

const toDate = (value: string | null): Date | null => (value === null ? null : new Date(value))

export function caseDetailRepository(db: SupabaseClient): CaseDetailRepository {
  return {
    async find(caseId) {
      const { data, error } = await db
        .from(CASES_TABLE)
        .select(CASE_DETAIL_COLUMNS)
        .eq('id', caseId)
        .order('created_at', { ascending: false, referencedTable: REGULARIZATIONS_TABLE })
        .maybeSingle()
      if (error) return err(delinquencyStorageFailed(error.message))
      if (data === null) return err(caseNotFound(caseId))
      const row = detailRowSchema.safeParse(data)
      if (!row.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))

      const balances = await db.rpc(APPOINTMENT_BALANCES_FUNCTION, { p_appointment_ids: [row.data.appointment_id] })
      if (balances.error) return err(delinquencyStorageFailed(balances.error.message))
      const parsedBalances = z.array(balanceRowSchema).safeParse(balances.data ?? [])
      if (!parsedBalances.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      const balance = parsedBalances.data.find((entry) => entry.appointment_id === row.data.appointment_id)

      return ok({
        caseId: row.data.id,
        clientId: row.data.client_id,
        appointmentId: row.data.appointment_id,
        pending: row.data.pending,
        pendingToday: balance?.pending ?? 0,
        state: row.data.state,
        detectedAt: new Date(row.data.detected_at),
        decidedAt: toDate(row.data.decided_at),
        settledAt: toDate(row.data.settled_at),
        exceptionReason: row.data.exception_reason,
        exceptionAmount: row.data.exception_amount,
        requests: row.data.delinquency_regularizations.map((request) => ({
          id: request.id,
          state: request.state,
          declaredAmount: request.declared_amount,
          reference: request.reference,
          approvedAmount: request.approved_amount,
          rejectionReason: request.rejection_reason,
          createdAt: new Date(request.created_at),
          reviewedAt: toDate(request.reviewed_at),
        })),
      })
    },
  }
}
