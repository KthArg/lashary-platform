import { randomUUID } from 'node:crypto'
import { systemClock } from '@/shared/clock'
import type { Result } from '@/shared/result'
import { listEntityEvents as listEntityEventsUseCase } from './application/list-entity-events'
import { record as recordUseCase } from './application/record'
import { auditEventReader } from './db/audit-event-reader'
import { auditEventRepository } from './db/audit-event-repository'
import type { RecordAuditEventInput } from './application/record'
import type { AuditEventView, AuditEventPayload } from './domain/audit-event'
import type { ListEntityEventsQuery } from './domain/entity-events-query'
import type {
  AuditEventValidationError,
  AuditQueryInvalid,
  AuditStorageFailed,
} from './domain/errors'

export async function record(
  input: RecordAuditEventInput,
): Promise<Result<AuditEventView, AuditEventValidationError>> {
  return recordUseCase({
    repo: await auditEventRepository(),
    newId: () => randomUUID(),
    clock: systemClock,
  })(input)
}

export async function listEntityEvents(
  query: ListEntityEventsQuery,
): Promise<Result<AuditEventView[], AuditQueryInvalid | AuditStorageFailed>> {
  return listEntityEventsUseCase({ reader: await auditEventReader() })(query)
}

export type { RecordAuditEventInput, AuditEventView, AuditEventPayload, ListEntityEventsQuery }
export type { AuditEventValidationError, AuditQueryInvalid, AuditStorageFailed }
export { isAuditEventValidationError, isAuditQueryInvalid, isAuditStorageFailed } from './domain/errors'
