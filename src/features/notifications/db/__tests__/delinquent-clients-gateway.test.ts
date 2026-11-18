import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { delinquentClientsGateway, DELINQUENCY_LIST_ACTIVE_FUNCTION, LIST_ACTIVE_PAGE_SIZE } from '../delinquent-clients-gateway'

type FakeResponse = { data: unknown; error: { message: string } | null }

const clientIdFor = (index: number): string => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
const SINCE = '2026-11-10T12:00:00+00:00'

function createFakeDb(responses: FakeResponse[]) {
  const calls: unknown[][] = []
  let nextResponse = 0
  const db = {
    rpc: async (name: string, args: unknown) => {
      calls.push([name, args])
      return responses[nextResponse++]
    },
  } as unknown as SupabaseClient
  return { db, calls }
}

function pageOfClients(from: number, size: number) {
  return Array.from({ length: size }, (_, offset) => ({ client_id: clientIdFor(from + offset), since: SINCE }))
}

describe('delinquentClientsGateway', () => {
  it('pide las morosidades activas por la función del contrato de delinquency y devuelve las clientas', async () => {
    const { db, calls } = createFakeDb([{ data: pageOfClients(1, 2), error: null }])

    const result = await delinquentClientsGateway(db).listActiveClientIds()

    expect(calls).toEqual([[DELINQUENCY_LIST_ACTIVE_FUNCTION, { p_limit: LIST_ACTIVE_PAGE_SIZE, p_after_since: null, p_after_client_id: null }]])
    expect(isOk(result) && result.value).toEqual([clientIdFor(1), clientIdFor(2)])
  })

  it('una página llena pide la siguiente desde el último de la anterior, hasta una página incompleta', async () => {
    const { db, calls } = createFakeDb([
      { data: pageOfClients(1, LIST_ACTIVE_PAGE_SIZE), error: null },
      { data: pageOfClients(LIST_ACTIVE_PAGE_SIZE + 1, 3), error: null },
    ])

    const result = await delinquentClientsGateway(db).listActiveClientIds()

    expect(calls).toHaveLength(2)
    expect(calls[1]).toEqual([
      DELINQUENCY_LIST_ACTIVE_FUNCTION,
      { p_limit: LIST_ACTIVE_PAGE_SIZE, p_after_since: SINCE, p_after_client_id: clientIdFor(LIST_ACTIVE_PAGE_SIZE) },
    ])
    expect(isOk(result) && result.value).toHaveLength(LIST_ACTIVE_PAGE_SIZE + 3)
  })

  it('sin morosidades activas devuelve una lista vacía', async () => {
    const { db } = createFakeDb([{ data: [], error: null }])

    const result = await delinquentClientsGateway(db).listActiveClientIds()

    expect(isOk(result) && result.value).toEqual([])
  })

  it('un error de la base o una fila inesperada son un fallo, no una lista a medias', async () => {
    const failed = await delinquentClientsGateway(createFakeDb([{ data: null, error: { message: 'boom' } }]).db).listActiveClientIds()
    const malformed = await delinquentClientsGateway(
      createFakeDb([{ data: [{ client_id: 'no-es-uuid', since: SINCE }], error: null }]).db,
    ).listActiveClientIds()

    expect(isErr(failed)).toBe(true)
    expect(isErr(malformed)).toBe(true)
  })
})
