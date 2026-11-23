import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { ok, err } from '@/shared/result'
import type { ClientOwedAmountPort } from '../application/ports'

export const DELINQUENCY_BOOKING_BLOCK_FUNCTION = 'delinquency_booking_block'

const FAILED = 'repository-failed' as const

const blockingCasesSchema = z.array(z.object({ pending: z.number().int() }))

export function clientOwedAmountGateway(db: SupabaseClient): ClientOwedAmountPort {
  return {
    async owedBy(clientId) {
      const { data, error } = await db.rpc(DELINQUENCY_BOOKING_BLOCK_FUNCTION, { p_client_id: clientId })
      if (error) return err(FAILED)

      const parsed = blockingCasesSchema.safeParse(data ?? [])
      if (!parsed.success) return err(FAILED)

      return ok(parsed.data.reduce((total, blockingCase) => total + blockingCase.pending, 0))
    },
  }
}
