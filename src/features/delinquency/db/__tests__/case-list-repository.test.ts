import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { isDelinquencyStorageFailed } from '../../domain/errors'
import { caseListRepository, CASES_TABLE, LIST_ACTIVE_FUNCTION } from '../case-list-repository'
import { CASE_COLUMNS } from '../case-row'
import { clientNames, CLIENT_NAMES_FUNCTION } from '../client-names'

const ANA = '1c9d1f0e-5a4b-4e0e-8d52-0d6a3e6f9a21'

const row = {
  id: '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11',
  client_id: ANA,
  appointment_id: '2d7e2a1f-6b5c-4f1f-9e63-1e7b4f7a0b32',
  pending: 20000,
  state: 'pending_review',
  detected_at: '2026-11-01T15:00:00+00:00',
  decided_at: null,
}

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = { then: (resolve: (value: FakeResponse) => unknown) => resolve(response) }
  for (const method of ['select', 'eq', 'order', 'limit']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = {
    from: (table: string) => (calls.push(['from', table]), query),
    rpc: async (name: string, args: unknown) => (calls.push(['rpc', name, args]), response),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('caseListRepository.listByState', () => {
  it('lee las morosidades de un estado, las más antiguas primero, con tope', async () => {
    const { db, calls } = createFakeDb({ data: [row], error: null })

    const result = await caseListRepository(db).listByState('pending_review', 50)

    expect(calls).toEqual([
      ['from', CASES_TABLE],
      ['select', CASE_COLUMNS],
      ['eq', 'state', 'pending_review'],
      ['order', 'detected_at', { ascending: true }],
      ['order', 'id', { ascending: true }],
      ['limit', 50],
    ])
    expect(isOk(result) && result.value[0].detectedAt).toEqual(new Date('2026-11-01T15:00:00Z'))
  })

  it('un error de la base o una fila con forma inesperada es un fallo de almacenamiento', async () => {
    const failed = await caseListRepository(createFakeDb({ data: null, error: { message: 'boom' } }).db).listByState(
      'active',
      10,
    )
    const malformed = await caseListRepository(createFakeDb({ data: [{ ...row, pending: 'mucho' }], error: null }).db).listByState(
      'active',
      10,
    )

    expect(isErr(failed) && isDelinquencyStorageFailed(failed.error)).toBe(true)
    expect(isErr(malformed) && isDelinquencyStorageFailed(malformed.error)).toBe(true)
  })
})

describe('caseListRepository.listActiveClients', () => {
  it('pide el listado del contrato con el tope y convierte las fechas', async () => {
    const { db, calls } = createFakeDb({
      data: [{ client_id: ANA, pending: 9000, since: '2026-10-20T15:00:00+00:00' }],
      error: null,
    })

    const result = await caseListRepository(db).listActiveClients(50)

    expect(calls).toEqual([['rpc', LIST_ACTIVE_FUNCTION, { p_limit: 50, p_after: null }]])
    expect(isOk(result) && result.value).toEqual([
      { clientId: ANA, pending: 9000, since: new Date('2026-10-20T15:00:00Z') },
    ])
  })
})

describe('clientNames', () => {
  it('pide los nombres por la función de clients y los devuelve por id', async () => {
    const { db, calls } = createFakeDb({ data: [{ client_id: ANA, full_name: 'Ana Pérez' }], error: null })

    const result = await clientNames(db).namesFor([ANA])

    expect(calls).toEqual([['rpc', CLIENT_NAMES_FUNCTION, { p_client_ids: [ANA] }]])
    expect(isOk(result) && result.value.get(ANA)).toBe('Ana Pérez')
  })

  it('sin clientas no llama a la base', async () => {
    const { db, calls } = createFakeDb({ data: [], error: null })

    const result = await clientNames(db).namesFor([])

    expect(calls).toEqual([])
    expect(isOk(result) && result.value.size).toBe(0)
  })
})
