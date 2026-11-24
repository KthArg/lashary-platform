import { describe, it, expect } from 'vitest'
import {
  TIMELINE_REQUESTS_MAX,
  hasPendingRequest,
  isCaseId,
  latestRequestIds,
  sortTimeline,
  type DetailRequest,
  type TimelineEvent,
} from '../case-detail'

const request = (id: string, state: DetailRequest['state'] = 'rejected'): DetailRequest => ({
  id,
  state,
  declaredAmount: 10000,
  reference: null,
  approvedAmount: null,
  rejectionReason: null,
  createdAt: new Date('2026-11-12T15:00:00Z'),
  reviewedAt: null,
})

const event = (id: string, createdAt: string): TimelineEvent => ({
  id,
  action: 'delinquency.case.confirmed',
  actorId: 'actor',
  createdAt: new Date(createdAt),
  entityType: 'delinquency_case',
})

describe('isCaseId', () => {
  it('acepta un uuid y rechaza cualquier otro texto', () => {
    expect(isCaseId('7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11')).toBe(true)
    expect(isCaseId('no-es-un-uuid')).toBe(false)
    expect(isCaseId('')).toBe(false)
  })
})

describe('hasPendingRequest', () => {
  it('es verdadero solo si alguna solicitud espera aprobación', () => {
    expect(hasPendingRequest([request('a'), request('b', 'pending_approval')])).toBe(true)
    expect(hasPendingRequest([request('a', 'approved'), request('b', 'replaced')])).toBe(false)
    expect(hasPendingRequest([])).toBe(false)
  })
})

describe('latestRequestIds', () => {
  it('conserva el orden y recorta a las más recientes que admite la bitácora', () => {
    const requests = Array.from({ length: TIMELINE_REQUESTS_MAX + 5 }, (_, index) => `r${index}`)
    const ids = latestRequestIds(requests)

    expect(ids).toHaveLength(TIMELINE_REQUESTS_MAX)
    expect(ids[0]).toBe('r0')
  })
})

describe('sortTimeline', () => {
  it('ordena por fecha y desempata por id sin tocar la lista original', () => {
    const events = [event('b', '2026-11-12T10:00:00Z'), event('c', '2026-11-11T10:00:00Z'), event('a', '2026-11-12T10:00:00Z')]

    expect(sortTimeline(events).map((item) => item.id)).toEqual(['c', 'a', 'b'])
    expect(events[0].id).toBe('b')
  })
})
