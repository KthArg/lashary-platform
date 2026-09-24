// Entry point público de la feature audit (ARCH-003). Superficie de un solo verbo, de servidor:
// registrar un evento en la bitácora. Cablea el repositorio Supabase, el generador de id y el
// reloj real — quien llama no conoce nada de la persistencia interna.

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
