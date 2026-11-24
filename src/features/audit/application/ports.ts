import type { Result } from '@/shared/result'
import type { AuditEvent, AuditEventView } from '../domain/audit-event'
import type { NormalizedEntityEventsQuery } from '../domain/entity-events-query'
import type { AuditStorageFailed } from '../domain/errors'

export interface AuditEventRepository {
  insert(event: AuditEvent): Promise<void>
}

export interface AuditEventReader {
  listByEntities(query: NormalizedEntityEventsQuery): Promise<Result<AuditEventView[], AuditStorageFailed>>
}
