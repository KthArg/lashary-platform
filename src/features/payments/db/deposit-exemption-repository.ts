import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import { ok, err, type Result } from '@/shared/result'
import type { DepositExemption } from '../domain/deposit-exemption'
import { clientAlreadyExempt, type ClientAlreadyExempt } from '../domain/errors'
import type { DepositExemptionRepository } from '../application/ports'

const TABLE = 'payments_deposit_exemptions'
const UNIQUE_VIOLATION = '23505'

type InsertRow = {
  id: string
  client_id: string
  exempted_by: string
  reason: string
  active: boolean
  created_at: string
}

export function toRow(exemption: DepositExemption): InsertRow {
  return {
    id: exemption.id,
    client_id: exemption.clientId,
    exempted_by: exemption.exemptedBy,
    reason: exemption.reason,
    active: exemption.active,
    created_at: exemption.createdAt.toISOString(),
  }
}

export function createSupabaseDepositExemptionRepository(
  db: SupabaseClient,
): DepositExemptionRepository {
  return {
    async save(exemption: DepositExemption): Promise<Result<void, ClientAlreadyExempt>> {
      const { error } = await db.from(TABLE).insert(toRow(exemption))
      if (error) {
        if (error.code === UNIQUE_VIOLATION) {
          return err(clientAlreadyExempt(exemption.clientId))
        }
        throw new Error(`${TABLE}.save: ${error.message}`)
      }
      return ok(undefined)
    },
  }
}

export async function depositExemptionRepository(): Promise<DepositExemptionRepository> {
  return createSupabaseDepositExemptionRepository(await createClient())
}
