import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { createClient } from '@/shared/lib/supabase/server'
import { ok, err } from '@/shared/result'
import type { AuditEventView } from '../domain/audit-event'
import { auditStorageFailed } from '../domain/errors'
import type { AuditEventReader } from '../application/ports'

export const AUDIT_EVENTS_TABLE = 'audit_events'
export const AUDIT_EVENT_COLUMNS =
  'id, actor_id, action, entity_type, entity_id, payload, created_at'
export const UNEXPECTED_ROW = 'la base devolvió una fila con una forma inesperada'

const auditEventRowSchema = z.object({
  id: z.string(),
  actor_id: z.string(),
  action: z.string(),
  entity_type: z.string(),
  entity_id: z.string(),
  payload: z.record(z.string(), z.unknown()),
  created_at: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
})

const rowToView = (row: z.infer<typeof auditEventRowSchema>): AuditEventView => ({
  id: row.id,
  actorId: row.actor_id,
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  payload: row.payload,
  createdAt: new Date(row.created_at),
})

export function createSupabaseAuditEventReader(db: SupabaseClient): AuditEventReader {
  return {
    async listByEntities({ entityType, entityIds, limit }) {
      const { data, error } = await db
        .from(AUDIT_EVENTS_TABLE)
        .select(AUDIT_EVENT_COLUMNS)
        .eq('entity_type', entityType)
        .in('entity_id', [...entityIds])
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(limit)
      if (error) return err(auditStorageFailed(error.message))

      const parsed = z.array(auditEventRowSchema).safeParse(data ?? [])
      if (!parsed.success) return err(auditStorageFailed(UNEXPECTED_ROW))
      return ok(parsed.data.map(rowToView))
    },
  }
}

export async function auditEventReader(): Promise<AuditEventReader> {
  return createSupabaseAuditEventReader(await createClient())
}
