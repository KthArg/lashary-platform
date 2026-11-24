import { describe, it, expect, vi, beforeEach } from 'vitest'
import { err, ok, isErr, isOk } from '@/shared/result'
import { TIMELINE_ENTITY_TYPES, TIMELINE_REQUESTS_MAX } from '../../domain/case-detail'

const mockListEntityEvents = vi.fn()

vi.mock('@/features/audit', () => ({
  listEntityEvents: (...args: unknown[]) => mockListEntityEvents(...args),
}))

import { auditTimeline, TIMELINE_EVENTS_LIMIT } from '../audit-timeline'

const CASE_ID = '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11'
const REQUEST_ID = '8c1f6a9f-4d2b-4d66-8d2f-3a5b7c9e1f22'

const auditEvent = (id: string, entityType: string, createdAt: string, action = 'delinquency.case.confirmed') => ({
  id,
  actorId: 'actor',
  action,
  entityType,
  entityId: CASE_ID,
  payload: {},
  createdAt: new Date(createdAt),
})

const askedFor = (entityType: string) =>
  mockListEntityEvents.mock.calls.map(([query]) => query).find((query) => query.entityType === entityType)

beforeEach(() => {
  mockListEntityEvents.mockReset()
})

describe('auditTimeline.timelineFor', () => {
  it('pide a audit los eventos de la morosidad y los de sus solicitudes, cada uno con su tipo', async () => {
    mockListEntityEvents.mockResolvedValue(ok([]))
    await auditTimeline().timelineFor({ caseId: CASE_ID, requestIds: [REQUEST_ID] })

    expect(mockListEntityEvents).toHaveBeenCalledTimes(2)
    expect(askedFor(TIMELINE_ENTITY_TYPES.case)).toEqual({
      entityType: TIMELINE_ENTITY_TYPES.case,
      entityIds: [CASE_ID],
      limit: TIMELINE_EVENTS_LIMIT,
    })
    expect(askedFor(TIMELINE_ENTITY_TYPES.request)).toEqual({
      entityType: TIMELINE_ENTITY_TYPES.request,
      entityIds: [REQUEST_ID],
      limit: TIMELINE_EVENTS_LIMIT,
    })
  })

  it('sin solicitudes pide solo los eventos de la morosidad', async () => {
    mockListEntityEvents.mockResolvedValue(ok([]))
    await auditTimeline().timelineFor({ caseId: CASE_ID, requestIds: [] })

    expect(mockListEntityEvents).toHaveBeenCalledTimes(1)
  })

  it('con más solicitudes de las que admite audit toma las más recientes', async () => {
    mockListEntityEvents.mockResolvedValue(ok([]))
    const requestIds = Array.from({ length: TIMELINE_REQUESTS_MAX + 3 }, (_, index) => `r${index}`)
    await auditTimeline().timelineFor({ caseId: CASE_ID, requestIds })

    expect(askedFor(TIMELINE_ENTITY_TYPES.request).entityIds).toEqual(requestIds.slice(0, TIMELINE_REQUESTS_MAX))
  })

  it('junta ambas listas ordenadas por fecha e id y conserva las acciones desconocidas', async () => {
    const otherAction = 'otra.accion'
    mockListEntityEvents.mockImplementation(async ({ entityType }: { entityType: string }) =>
      entityType === TIMELINE_ENTITY_TYPES.case
        ? ok([auditEvent('b', entityType, '2026-11-12T10:00:00Z'), auditEvent('d', entityType, '2026-11-14T10:00:00Z', otherAction)])
        : ok([auditEvent('a', entityType, '2026-11-12T10:00:00Z'), auditEvent('c', entityType, '2026-11-13T10:00:00Z')]),
    )
    const result = await auditTimeline().timelineFor({ caseId: CASE_ID, requestIds: [REQUEST_ID] })

    expect(isOk(result) && result.value.map((event) => event.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(isOk(result) && result.value[3]).toEqual({
      id: 'd',
      action: otherAction,
      actorId: 'actor',
      createdAt: new Date('2026-11-14T10:00:00Z'),
      entityType: TIMELINE_ENTITY_TYPES.case,
    })
  })

  it('traduce el error de audit, de cualquiera de las dos lecturas, a un fallo de almacenamiento', async () => {
    mockListEntityEvents.mockImplementation(async ({ entityType }: { entityType: string }) =>
      entityType === TIMELINE_ENTITY_TYPES.request ? err({ code: 'AUDIT_STORAGE_FAILED', message: 'caída' }) : ok([]),
    )
    const result = await auditTimeline().timelineFor({ caseId: CASE_ID, requestIds: [REQUEST_ID] })

    expect(isErr(result) && result.error).toEqual({ code: 'DELINQUENCY_STORAGE_FAILED', message: 'caída' })
  })
})
