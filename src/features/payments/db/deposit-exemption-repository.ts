import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import type { DepositExemption } from '../domain/deposit-exemption'
import type { DepositExemptionRepository } from '../application/ports'
import { ok, err, type Result } from '@/shared/result'
import { clientAlreadyExempt, type ClientAlreadyExempt } from '../domain/errors'

const TABLE = 'payments_deposit_exemptions'

type InsertRow = {
  id: string
  client_id: string
  exempted_by: string
  reason: string
  active: boolean
  created_at: string
}

export function toRow(exemption: DepositExemption): InsertRow {
  const view = exemption.toView()
  return {
    id: view.id,
    client_id: view.clientId,
    exempted_by: view.exemptedBy,
    reason: view.reason,
    active: view.active,
    created_at: view.createdAt.toISOString(),
  }
}

export class SupabaseDepositExemptionRepository implements DepositExemptionRepository {
  constructor(private readonly db: SupabaseClient) {}

  async save(exemption: DepositExemption): Promise<Result<void, ClientAlreadyExempt>> {
    const { error } = await this.db.from(TABLE).insert(toRow(exemption))
    if (error) {
      if (error.code === '23505') {
        return err(clientAlreadyExempt(exemption.clientId))
      }
      throw new Error(`${TABLE}.save: ${error.message}`)
    }
    return ok(undefined)
  }
}

export async function depositExemptionRepository(): Promise<SupabaseDepositExemptionRepository> {
  return new SupabaseDepositExemptionRepository(await createClient())
}
