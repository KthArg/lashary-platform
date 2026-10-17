import { ok, err, type Result } from '@/shared/result'
import { auditEventValidationError, type AuditEventValidationError } from './errors'

export type AuditEventPayload = Record<string, unknown>

export type AuditEventInput = {
  actorId: string
  action: string
  entityType: string
  entityId: string
  payload?: AuditEventPayload
  createdAt: Date
}

export type AuditEventView = {
  id: string
  actorId: string
  action: string
  entityType: string
  entityId: string
  payload: AuditEventPayload
  createdAt: Date
}

const auditEventBrand: unique symbol = Symbol('AuditEvent')

export interface AuditEvent {
  readonly [auditEventBrand]: true
  readonly id: string
  readonly actorId: string
  readonly action: string
  readonly entityType: string
  readonly entityId: string
  readonly payload: AuditEventPayload
  readonly createdAt: Date
}

export function buildAuditEvent(
  id: string,
  input: AuditEventInput,
): Result<AuditEvent, AuditEventValidationError> {
  const problems: string[] = []

  const actorId = input.actorId.trim()
  if (actorId.length === 0) problems.push('el actor no puede estar vacío')

  const action = input.action.trim()
  if (action.length === 0) problems.push('la acción no puede estar vacía')

  const entityType = input.entityType.trim()
  if (entityType.length === 0) problems.push('el tipo de recurso no puede estar vacío')

  const entityId = input.entityId.trim()
  if (entityId.length === 0) problems.push('el recurso no puede estar vacío')

  if (problems.length > 0) {
    return err(auditEventValidationError(problems))
  }

  return ok({
    [auditEventBrand]: true,
    id,
    actorId,
    action,
    entityType,
    entityId,
    payload: input.payload ?? {},
    createdAt: input.createdAt,
  })
}

export function auditEventToView(event: AuditEvent): AuditEventView {
  return {
    id: event.id,
    actorId: event.actorId,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId,
    payload: event.payload,
    createdAt: event.createdAt,
  }
}
