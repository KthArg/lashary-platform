import type { AuditEvent } from '../domain/audit-event'

export interface AuditEventRepository {
  insert(event: AuditEvent): Promise<void>
}
