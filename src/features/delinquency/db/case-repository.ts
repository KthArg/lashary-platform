import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '@/shared/result'
import {
  caseAlreadyDecided,
  caseNotActive,
  caseNotFound,
  delinquencyStorageFailed,
  invalidForgiveAmount,
  invalidReason,
} from '../domain/errors'
import type { CaseRepository } from '../application/ports'
import { caseRowSchema, toCase, UNEXPECTED_ROW } from './case-row'

export const DECIDE_CASE_FUNCTION = 'delinquency_decide_case'
export const LIFT_CASE_FUNCTION = 'delinquency_lift_case'
export const FORGIVE_CASE_FUNCTION = 'delinquency_forgive_case'

const PG_CASE_NOT_FOUND = 'P0002'
const PG_CASE_ALREADY_DECIDED = '55000'
const PG_CASE_NOT_ACTIVE = '55001'
const PG_INVALID_FORGIVE_AMOUNT = '22023'
const PG_INVALID_REASON = '22004'

export function caseRepository(db: SupabaseClient): CaseRepository {
  return {
    async decide(caseId, decision) {
      const { data, error } = await db.rpc(DECIDE_CASE_FUNCTION, { p_case_id: caseId, p_decision: decision })
      if (error) {
        if (error.code === PG_CASE_NOT_FOUND) return err(caseNotFound(caseId))
        if (error.code === PG_CASE_ALREADY_DECIDED) return err(caseAlreadyDecided(caseId))
        return err(delinquencyStorageFailed(error.message))
      }
      const parsed = caseRowSchema.safeParse(data)
      if (!parsed.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      return ok(toCase(parsed.data))
    },

    async lift(caseId, reason) {
      const { data, error } = await db.rpc(LIFT_CASE_FUNCTION, { p_case_id: caseId, p_reason: reason })
      if (error) {
        if (error.code === PG_CASE_NOT_FOUND) return err(caseNotFound(caseId))
        if (error.code === PG_CASE_NOT_ACTIVE) return err(caseNotActive(caseId))
        if (error.code === PG_INVALID_REASON) return err(invalidReason())
        return err(delinquencyStorageFailed(error.message))
      }
      const parsed = caseRowSchema.safeParse(data)
      if (!parsed.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      return ok(toCase(parsed.data))
    },

    async forgive(caseId, amount, reason) {
      const { data, error } = await db.rpc(FORGIVE_CASE_FUNCTION, {
        p_case_id: caseId,
        p_amount: amount,
        p_reason: reason,
      })
      if (error) {
        if (error.code === PG_CASE_NOT_FOUND) return err(caseNotFound(caseId))
        if (error.code === PG_CASE_NOT_ACTIVE) return err(caseNotActive(caseId))
        if (error.code === PG_INVALID_REASON) return err(invalidReason())
        if (error.code === PG_INVALID_FORGIVE_AMOUNT) return err(invalidForgiveAmount())
        return err(delinquencyStorageFailed(error.message))
      }
      const parsed = caseRowSchema.safeParse(data)
      if (!parsed.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      return ok(toCase(parsed.data))
    },
  }
}
