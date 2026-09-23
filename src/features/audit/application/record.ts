import { ok, isErr, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import {
  AuditEvent,
  type AuditEventPayload,
  type AuditEventView,
} from '../domain/audit-event'
import type { AuditEventValidationError } from '../domain/errors'
import type { AuditEventRepository } from './ports'

// Lo que llega de quien emite el evento (otra feature, desde su propio código de servidor — no
// hay borde HTTP acá, así que no hay Zod que validar: quien llama ya construyó estos valores
// desde su propio dominio, p.ej. el id de una técnica o de una clienta reales).
export type RecordAuditEventInput = {
  actorId: string
  action: string
  entityType: string
  entityId: string
  payload?: AuditEventPayload
}

export type RecordDeps = {
  repo: AuditEventRepository
  newId: () => string
  clock: Clock
}

export const record =
  (deps: RecordDeps) =>
  async (
    input: RecordAuditEventInput,
  ): Promise<Result<AuditEventView, AuditEventValidationError>> => {
    const built = AuditEvent.create(deps.newId(), {
      ...input,
      createdAt: deps.clock(),
    })
    if (isErr(built)) return built

    await deps.repo.insert(built.value)
    return ok(built.value.toView())
  }
