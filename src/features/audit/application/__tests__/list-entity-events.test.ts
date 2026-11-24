import { describe, it, expect } from 'vitest'
import { ok, err, isOk, isErr, type Result } from '@/shared/result'
import type { AuditEventView } from '../../domain/audit-event'
import { ENTITY_EVENTS_LIMITS } from '../../domain/entity-events-query'
import {
  auditStorageFailed,
  isAuditQueryInvalid,
  isAuditStorageFailed,
  type AuditStorageFailed,
} from '../../domain/errors'
import type { AuditEventReader } from '../ports'
import { listEntityEvents } from '../list-entity-events'

const CASE_ID = '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11'

const event: AuditEventView = {
  id: 'evt-1',
  actorId: '00000000-0000-0000-0000-0000000000a1',
  action: 'delinquency.case.lifted',
  entityType: 'delinquency_case',
  entityId: CASE_ID,
  payload: {},
  createdAt: new Date('2026-11-01T15:00:00Z'),
}

async function listWith(
  response: Result<AuditEventView[], AuditStorageFailed>,
  entityType: string,
  entityIds: string[],
) {
  const calls: unknown[][] = []
  const reader: AuditEventReader = {
    async listByEntities(query) {
      calls.push([query.entityType, query.entityIds, query.limit])
      return response
    },
  }
  const result = await listEntityEvents({ reader })({ entityType, entityIds })
  return { result, calls }
}

describe('listEntityEvents', () => {
  it('devuelve lo que entrega el lector, con el tipo recortado y el límite por defecto', async () => {
    const { result, calls } = await listWith(ok([event]), ' delinquency_case ', [CASE_ID])

    expect(isOk(result) && result.value).toEqual([event])
    expect(calls).toEqual([['delinquency_case', [CASE_ID], ENTITY_EVENTS_LIMITS.defaultLimit]])
  })

  it('sin recursos devuelve una lista vacía y no consulta', async () => {
    const { result, calls } = await listWith(ok([event]), 'delinquency_case', [])

    expect(isOk(result) && result.value).toEqual([])
    expect(calls).toHaveLength(0)
  })

  it('una consulta inválida no consulta', async () => {
    const { result, calls } = await listWith(ok([event]), '', [CASE_ID])

    expect(isErr(result) && isAuditQueryInvalid(result.error)).toBe(true)
    expect(calls).toHaveLength(0)
  })

  it('propaga el error de la base', async () => {
    const { result } = await listWith(err(auditStorageFailed('sin red')), 'delinquency_case', [CASE_ID])

    expect(isErr(result) && isAuditStorageFailed(result.error)).toBe(true)
  })
})
