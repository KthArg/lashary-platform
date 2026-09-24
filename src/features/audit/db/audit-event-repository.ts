import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import type { AuditEvent } from '../domain/audit-event'
import type { AuditEventRepository } from '../application/ports'

const TABLE = 'audit_events'

type InsertRow = {
  id: string
  actor_id: string
  action: string
  entity_type: string
  entity_id: string
  payload: Record<string, unknown>
  created_at: string
}

// Solo escribe: el puerto no pide lectura (application/ports.ts), así que no hay rowToDomain ni
// Row de lectura — se agregan cuando una historia futura necesite consultar la bitácora.
// Exportada para su test unitario: sin Supabase local no hay forma de ejercer un insert() que
// tenga éxito (RLS exige sesión de staff, que las pruebas de integración no pueden simular), así
// que el mapeo se prueba solo, aparte.
export function toRow(event: AuditEvent): InsertRow {
  const view = event.toView()
  return {
    id: view.id,
    actor_id: view.actorId,
    action: view.action,
    entity_type: view.entityType,
    entity_id: view.entityId,
    payload: view.payload,
    created_at: view.createdAt.toISOString(),
  }
}

export class SupabaseAuditEventRepository implements AuditEventRepository {
  constructor(private readonly db: SupabaseClient) {}

  async insert(event: AuditEvent): Promise<void> {
    const { error } = await this.db.from(TABLE).insert(toRow(event))
    if (error) throw new Error(`${TABLE}.insert: ${error.message}`)
  }
}

// Fábrica para el contexto de servidor de Next (server components / actions / otras features).
export async function auditEventRepository(): Promise<SupabaseAuditEventRepository> {
  return new SupabaseAuditEventRepository(await createClient())
}
