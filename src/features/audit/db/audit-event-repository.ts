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

export function toRow(event: AuditEvent): InsertRow {
  return {
    id: event.id,
    actor_id: event.actorId,
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId,
    payload: event.payload,
    created_at: event.createdAt.toISOString(),
  }
}

export function createSupabaseAuditEventRepository(db: SupabaseClient): AuditEventRepository {
  return {
    async insert(event) {
      const { error } = await db.from(TABLE).insert(toRow(event))
      if (error) throw new Error(`${TABLE}.insert: ${error.message}`)
    },
  }
}

export async function auditEventRepository(): Promise<AuditEventRepository> {
  return createSupabaseAuditEventRepository(await createClient())
}
