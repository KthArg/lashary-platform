import { ok, isErr, type Result } from '@/shared/result'
import type { AuditEventView } from '../domain/audit-event'
import {
  normalizeEntityEventsQuery,
  type ListEntityEventsQuery,
} from '../domain/entity-events-query'
import type { AuditQueryInvalid, AuditStorageFailed } from '../domain/errors'
import type { AuditEventReader } from './ports'

export const listEntityEvents =
  (deps: { reader: AuditEventReader }) =>
  async (
    query: ListEntityEventsQuery,
  ): Promise<Result<AuditEventView[], AuditQueryInvalid | AuditStorageFailed>> => {
    const normalized = normalizeEntityEventsQuery(query)
    if (isErr(normalized)) return normalized
    if (normalized.value.entityIds.length === 0) return ok([])

    return deps.reader.listByEntities(normalized.value)
  }
