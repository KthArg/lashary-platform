import { listEntityEvents } from '@/features/audit'
import { err, isErr, ok } from '@/shared/result'
import { TIMELINE_ENTITY_TYPES, latestRequestIds, sortTimeline } from '../domain/case-detail'
import { delinquencyStorageFailed } from '../domain/errors'
import type { AuditTimelinePort } from '../application/ports'

export const TIMELINE_EVENTS_LIMIT = 200

export function auditTimeline(): AuditTimelinePort {
  return {
    async timelineFor({ caseId, requestIds }) {
      const requestEntityIds = latestRequestIds(requestIds)
      const [caseEvents, requestEvents] = await Promise.all([
        listEntityEvents({ entityType: TIMELINE_ENTITY_TYPES.case, entityIds: [caseId], limit: TIMELINE_EVENTS_LIMIT }),
        requestEntityIds.length === 0
          ? Promise.resolve(ok([]))
          : listEntityEvents({
              entityType: TIMELINE_ENTITY_TYPES.request,
              entityIds: requestEntityIds,
              limit: TIMELINE_EVENTS_LIMIT,
            }),
      ])
      if (isErr(caseEvents)) return err(delinquencyStorageFailed(caseEvents.error.message))
      if (isErr(requestEvents)) return err(delinquencyStorageFailed(requestEvents.error.message))

      return ok(
        sortTimeline(
          [...caseEvents.value, ...requestEvents.value].map((event) => ({
            id: event.id,
            action: event.action,
            actorId: event.actorId,
            createdAt: event.createdAt,
            entityType: event.entityType,
          })),
        ),
      )
    },
  }
}
