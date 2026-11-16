import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { err, ok } from '@/shared/result'
import { storageFailed } from '../domain/errors'
import type { ReapplicationCandidate, ReapplicationCandidatesRepository } from '../application/ports'

export const REAPPLICATION_CANDIDATES_FUNCTION = 'scheduling_reapplication_candidates'

const candidateRowSchema = z.object({
  client_id: z.string().uuid(),
  technique_id: z.string().uuid(),
  last_completed_at: z.string(),
})

function toCandidate(row: z.infer<typeof candidateRowSchema>): ReapplicationCandidate {
  return {
    clientId: row.client_id,
    techniqueId: row.technique_id,
    lastCompletedAt: new Date(row.last_completed_at),
  }
}

export function createSupabaseReapplicationCandidatesRepository(db: SupabaseClient): ReapplicationCandidatesRepository {
  return {
    async listCandidates() {
      const { data, error } = await db.rpc(REAPPLICATION_CANDIDATES_FUNCTION)
      if (error) return err(storageFailed(error.message))

      const parsed = z.array(candidateRowSchema).safeParse(data ?? [])
      if (!parsed.success) return err(storageFailed('fila de candidato a re-aplicación inválida'))

      return ok(parsed.data.map(toCandidate))
    },
  }
}
