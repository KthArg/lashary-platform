import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { err, ok } from '@/shared/result'
import { CASE_STATES } from '../domain/delinquency-case'
import { delinquencyStorageFailed } from '../domain/errors'
import type { HistoryFilter } from '../domain/case-history'
import type { CaseHistoryRepository } from '../application/ports'
import { CASES_TABLE } from './case-list-repository'
import { REGULARIZATIONS_TABLE } from './regularization-queue-repository'
import { UNEXPECTED_ROW } from './case-row'

export const HISTORY_COLUMNS = 'id, client_id, appointment_id, pending, state, detected_at'
export const PENDING_REQUEST_STATE = 'pending_approval'

const historyRowSchema = z.object({
  id: z.string().guid(),
  client_id: z.string().guid(),
  appointment_id: z.string().guid(),
  pending: z.number().int().positive(),
  state: z.enum(CASE_STATES),
  detected_at: z.string(),
  delinquency_regularizations: z.array(z.object({ id: z.string().guid() })).default([]),
})

const totalSchema = z.number().int().nonnegative()

const embedFor = (filter: HistoryFilter): string => {
  const mode = filter === 'pending_approval' ? '!inner' : filter === 'active' ? '!left' : ''
  return `${REGULARIZATIONS_TABLE}${mode}(id)`
}

export function caseHistoryRepository(db: SupabaseClient): CaseHistoryRepository {
  return {
    async list({ filter, page, pageSize }) {
      let query = db
        .from(CASES_TABLE)
        .select(`${HISTORY_COLUMNS}, ${embedFor(filter)}`, { count: 'exact' })
        .eq(`${REGULARIZATIONS_TABLE}.state`, PENDING_REQUEST_STATE)

      if (filter === 'pending_approval') query = query.eq('state', 'active')
      else if (filter === 'active') query = query.eq('state', 'active').is(REGULARIZATIONS_TABLE, null)
      else if (filter !== 'all') query = query.eq('state', filter)

      const from = page * pageSize
      const { data, error, count } = await query
        .order('detected_at', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + pageSize - 1)
      if (error) return err(delinquencyStorageFailed(error.message))
      const rows = z.array(historyRowSchema).safeParse(data ?? [])
      const total = totalSchema.safeParse(count)
      if (!rows.success || !total.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))

      return ok({
        rows: rows.data.map((row) => ({
          caseId: row.id,
          clientId: row.client_id,
          appointmentId: row.appointment_id,
          pending: row.pending,
          state: row.state,
          detectedAt: new Date(row.detected_at),
          hasPendingRequest: row.delinquency_regularizations.length > 0,
        })),
        total: total.data,
      })
    },
  }
}
