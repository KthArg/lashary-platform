import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import type { DepositExemption } from '../domain/deposit-exemption'
import type { DepositExemptionRepository } from '../application/ports'
import { ClientAlreadyExempt } from '../domain/errors'

const TABLE = 'payments_deposit_exemptions'

type InsertRow = {
  id: string
  client_id: string
  exempted_by: string
  reason: string
  active: boolean
  created_at: string
}

// Solo escribe: el puerto no pide lectura (application/ports.ts). Exportada para su test
// unitario — sin Supabase local no hay forma de ejercer un save() exitoso, RLS exige sesión de
// staff real (igual que en audit).
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

  async save(exemption: DepositExemption): Promise<void> {
    const { error } = await this.db.from(TABLE).insert(toRow(exemption))
    if (error) {
      // 23505 = unique_violation (Postgres). La única constraint de unicidad de esta tabla es
      // idx_payments_deposit_exemptions_client_active — un caso de negocio esperable (DOM-006),
      // no una falla de infraestructura genuina.
      if (error.code === '23505') {
        throw new ClientAlreadyExempt(exemption.clientId)
      }
      throw new Error(`${TABLE}.save: ${error.message}`)
    }
  }
}

// Fábrica para el contexto de servidor de Next (server components / actions).
export async function depositExemptionRepository(): Promise<SupabaseDepositExemptionRepository> {
  return new SupabaseDepositExemptionRepository(await createClient())
}
