import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import { CASE_STATES, type DelinquencyCase } from '../domain/delinquency-case'
import { caseAlreadyDecided, caseNotFound, delinquencyStorageFailed } from '../domain/errors'
import type { CaseRepository } from '../application/ports'

export const DECIDE_CASE_FUNCTION = 'delinquency_decide_case'

const PG_CASE_NOT_FOUND = 'P0002'
const PG_CASE_ALREADY_DECIDED = '55000'
const UNEXPECTED_ROW = 'la base devolvió una morosidad con una forma inesperada'

const caseRowSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  appointment_id: z.string().uuid(),
  pending: z.number().int().positive(),
  state: z.enum(CASE_STATES),
  detected_at: z.string(),
  decided_at: z.string().nullable(),
})

type CaseRow = z.infer<typeof caseRowSchema>

const toCase = (row: CaseRow): DelinquencyCase => ({
  id: row.id,
  clientId: row.client_id,
  appointmentId: row.appointment_id,
  pending: row.pending,
  state: row.state,
  detectedAt: new Date(row.detected_at),
  decidedAt: row.decided_at ? new Date(row.decided_at) : null,
})

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
