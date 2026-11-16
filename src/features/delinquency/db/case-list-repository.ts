import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import { delinquencyStorageFailed } from '../domain/errors'
import type { ActiveClient } from '../domain/active-client'
import type { CaseListRepository } from '../application/ports'
import { CASE_COLUMNS, caseRowSchema, toCase, UNEXPECTED_ROW } from './case-row'

export const CASES_TABLE = 'delinquency_cases'
export const LIST_ACTIVE_FUNCTION = 'delinquency_list_active'

const activeRowSchema = z.object({
  client_id: z.string().uuid(),
  pending: z.number().int().positive(),
  since: z.string(),
})

export function caseListRepository(db: SupabaseClient): CaseListRepository {
  return {
    async listByState(state, limit) {
      const { data, error } = await db
        .from(CASES_TABLE)
        .select(CASE_COLUMNS)
        .eq('state', state)
        .order('detected_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(limit)
      if (error) return err(delinquencyStorageFailed(error.message))
      const parsed = z.array(caseRowSchema).safeParse(data ?? [])
      if (!parsed.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      return ok(parsed.data.map(toCase))
    },

    async listActiveClients(limit) {
      const { data, error } = await db.rpc(LIST_ACTIVE_FUNCTION, { p_limit: limit, p_after_since: null, p_after_client_id: null })
      if (error) return err(delinquencyStorageFailed(error.message))
      const parsed = z.array(activeRowSchema).safeParse(data ?? [])
      if (!parsed.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      const clients: ActiveClient[] = parsed.data.map((row) => ({
        clientId: row.client_id,
        pending: row.pending,
        since: new Date(row.since),
      }))
      return ok(clients)
    },
  }
}
