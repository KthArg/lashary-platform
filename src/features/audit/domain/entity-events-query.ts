import { ok, err, type Result } from '@/shared/result'
import { auditQueryInvalid, type AuditQueryInvalid } from './errors'

export const ENTITY_EVENTS_LIMITS = {
  maxEntityIds: 50,
  defaultLimit: 100,
  maxLimit: 200,
} as const

export type ListEntityEventsQuery = {
  entityType: string
  entityIds: readonly string[]
  limit?: number
}

export type NormalizedEntityEventsQuery = Required<ListEntityEventsQuery>

function normalizeLimit(limit: number | undefined): number {
  if (limit === undefined || !Number.isInteger(limit) || limit < 1) {
    return ENTITY_EVENTS_LIMITS.defaultLimit
  }
  return Math.min(limit, ENTITY_EVENTS_LIMITS.maxLimit)
}

export function normalizeEntityEventsQuery(
  query: ListEntityEventsQuery,
): Result<NormalizedEntityEventsQuery, AuditQueryInvalid> {
  const entityType = query.entityType.trim()
  if (entityType.length === 0) return err(auditQueryInvalid('el tipo de recurso no puede estar vacío'))
  if (query.entityIds.length > ENTITY_EVENTS_LIMITS.maxEntityIds) {
    return err(auditQueryInvalid(`no se pueden pedir más de ${ENTITY_EVENTS_LIMITS.maxEntityIds} recursos a la vez`))
  }

  return ok({ entityType, entityIds: query.entityIds, limit: normalizeLimit(query.limit) })
}
