import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import type { ClientDelinquency } from '../domain/client-delinquency'
import type { DelinquencyStatesPort } from '../application/ports'

// Función del contrato de `delinquency` (docs/contracts/delinquency-api.md): la morosidad no se lee por su tabla (ARCH-005).
export const DELINQUENCY_STATES_FUNCTION = 'delinquency_client_states'

const stateRowSchema = z.object({
  client_id: z.string().uuid(),
  state: z.enum(['active', 'pending_review']),
  pending: z.number().int().positive(),
})

export function delinquencyStatesGateway(db: SupabaseClient): DelinquencyStatesPort {
  return {
    async statesFor(ids) {
      if (ids.length === 0) return ok(new Map<string, ClientDelinquency>())
      try {
        const { data, error } = await db.rpc(DELINQUENCY_STATES_FUNCTION, { p_client_ids: ids })
        if (error) return err('repository-failed')
        const parsed = z.array(stateRowSchema).safeParse(data ?? [])
        if (!parsed.success) return err('repository-failed')
        return ok(new Map(parsed.data.map((row) => [row.client_id, { state: row.state, pending: row.pending }])))
      } catch {
        return err('repository-failed')
      }
    },
  }
}
