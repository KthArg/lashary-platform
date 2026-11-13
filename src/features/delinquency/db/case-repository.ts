import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err } from '@/shared/result'
import { caseAlreadyDecided, caseNotFound, delinquencyStorageFailed } from '../domain/errors'
import type { CaseRepository } from '../application/ports'
import { caseRowSchema, toCase, UNEXPECTED_ROW } from './case-row'

export const DECIDE_CASE_FUNCTION = 'delinquency_decide_case'

const PG_CASE_NOT_FOUND = 'P0002'
const PG_CASE_ALREADY_DECIDED = '55000'

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
  }
}
