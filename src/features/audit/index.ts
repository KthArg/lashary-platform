import { randomUUID } from 'node:crypto'
import { systemClock } from '@/shared/clock'
import type { Result } from '@/shared/result'
import { record as recordUseCase } from './application/record'
import { auditEventRepository } from './db/audit-event-repository'
import type { RecordAuditEventInput } from './application/record'
import type { AuditEventView, AuditEventPayload } from './domain/audit-event'
import type { AuditEventValidationError } from './domain/errors'

export async function record(
  input: RecordAuditEventInput,
): Promise<Result<AuditEventView, AuditEventValidationError>> {
  return recordUseCase({
    repo: await auditEventRepository(),
    newId: () => randomUUID(),
    clock: systemClock,
  })(input)
}

export type { RecordAuditEventInput, AuditEventView, AuditEventPayload }
export { AuditEventValidationError } from './domain/errors'
