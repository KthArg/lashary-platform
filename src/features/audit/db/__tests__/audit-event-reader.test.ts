import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { isAuditStorageFailed } from '../../domain/errors'
import {
  AUDIT_EVENT_COLUMNS,
  AUDIT_EVENTS_TABLE,
  createSupabaseAuditEventReader,
} from '../audit-event-reader'

const CASE_ID = '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11'
const ACTOR_ID = '00000000-0000-0000-0000-0000000000a1'
const PAGE_LIMIT = 25

const validRow = {
  id: 'f3a1c2d4-0b5e-4a6f-8c7d-9e0f1a2b3c4d',
  actor_id: ACTOR_ID,
  action: 'delinquency.case.lifted',
  entity_type: 'delinquency_case',
  entity_id: CASE_ID,
  payload: { reason: 'pagó' },
  created_at: '2026-11-01T15:00:00+00:00',
}

async function listWithFakeDb(data: unknown, error: { message: string } | null = null) {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = { then: (resolve: (value: unknown) => unknown) => resolve({ data, error }) }
  for (const method of ['select', 'eq', 'in', 'order', 'limit']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = { from: (table: string) => (calls.push(['from', table]), query) } as unknown as SupabaseClient
  const result = await createSupabaseAuditEventReader(db).listByEntities({
    entityType: 'delinquency_case',
    entityIds: [CASE_ID],
    limit: PAGE_LIMIT,
  })
  return { result, calls }
}

describe('createSupabaseAuditEventReader.listByEntities', () => {
  it('filtra por tipo y recursos, ordena por fecha e id ascendente, aplica el tope y mapea la fila', async () => {
    const { result, calls } = await listWithFakeDb([validRow])

    expect(calls).toEqual([
      ['from', AUDIT_EVENTS_TABLE],
      ['select', AUDIT_EVENT_COLUMNS],
      ['eq', 'entity_type', 'delinquency_case'],
      ['in', 'entity_id', [CASE_ID]],
      ['order', 'created_at', { ascending: true }],
      ['order', 'id', { ascending: true }],
      ['limit', PAGE_LIMIT],
    ])
    expect(isOk(result) && result.value).toEqual([
      {
        id: validRow.id,
        actorId: ACTOR_ID,
        action: validRow.action,
        entityType: validRow.entity_type,
        entityId: CASE_ID,
        payload: { reason: 'pagó' },
        createdAt: new Date('2026-11-01T15:00:00Z'),
      },
    ])
  })

  it('un error de la base devuelve AuditStorageFailed y no lanza', async () => {
    const { result } = await listWithFakeDb(null, { message: 'conexión rechazada' })

    expect(isErr(result) && isAuditStorageFailed(result.error)).toBe(true)
  })

  it.each([
    ['un payload que no es objeto', { ...validRow, payload: 'texto' }],
    ['una fecha ilegible', { ...validRow, created_at: 'ayer' }],
  ])('una fila con %s devuelve AuditStorageFailed', async (_caso, row) => {
    const { result } = await listWithFakeDb([row])

    expect(isErr(result) && isAuditStorageFailed(result.error)).toBe(true)
  })
})
