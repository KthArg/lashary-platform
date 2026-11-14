import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import type { DelinquencyState, DelinquencyStatesPort } from '../application/ports'

// Función del contrato de `delinquency` (docs/contracts/delinquency-api.md): la morosidad no se lee
// por su tabla (ARCH-005). Mismo gateway que ya usa `clients` (db/delinquency-states-gateway.ts),
// repetido aquí porque cada feature consume el contrato por su propio puerto (ARCH-004).
export const DELINQUENCY_STATES_FUNCTION = 'delinquency_client_states'

const stateRowSchema = z.object({
  client_id: z.string().uuid(),
  state: z.enum(['active', 'pending_review']),
})

export function delinquencyStatesGateway(db: SupabaseClient): DelinquencyStatesPort {
  return {
    async statesFor(clientIds) {
      if (clientIds.length === 0) return ok(new Map<string, DelinquencyState>())
      try {
        const { data, error } = await db.rpc(DELINQUENCY_STATES_FUNCTION, { p_client_ids: clientIds })
        if (error) return err('repository-failed')
        const parsed = z.array(stateRowSchema).safeParse(data ?? [])
        if (!parsed.success) return err('repository-failed')
        return ok(new Map(parsed.data.map((row) => [row.client_id, row.state])))
      } catch {
        return err('repository-failed')
      }
    },
  }
}
