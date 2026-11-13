import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { delinquencyStatesGateway, DELINQUENCY_STATES_FUNCTION } from '../delinquency-states-gateway'

const ANA = '1c9d1f0e-5a4b-4e0e-8d52-0d6a3e6f9a21'
const LUCIA = '3e8f3b2a-7c6d-4a2a-8f74-2f8c5a8b1c43'

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse | (() => never)) {
  const calls: unknown[][] = []
  const db = {
    rpc: async (name: string, args: unknown) => {
      calls.push([name, args])
      return typeof response === 'function' ? response() : response
    },
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('delinquencyStatesGateway', () => {
  it('pide el estado por la función del contrato de delinquency y lo devuelve por clienta', async () => {
    const { db, calls } = createFakeDb({
      data: [
        { client_id: ANA, state: 'active', pending: 20000, since: '2026-10-20T15:00:00+00:00' },
        { client_id: LUCIA, state: 'pending_review', pending: 7000, since: '2026-11-01T15:00:00+00:00' },
      ],
      error: null,
    })

    const result = await delinquencyStatesGateway(db).statesFor([ANA, LUCIA])

    expect(calls).toEqual([[DELINQUENCY_STATES_FUNCTION, { p_client_ids: [ANA, LUCIA] }]])
    expect(isOk(result) && result.value.get(ANA)).toEqual({ state: 'active', pending: 20000 })
    expect(isOk(result) && result.value.get(LUCIA)).toEqual({ state: 'pending_review', pending: 7000 })
  })

  it('sin clientas no llama a la base', async () => {
    const { db, calls } = createFakeDb({ data: [], error: null })

    const result = await delinquencyStatesGateway(db).statesFor([])

    expect(calls).toEqual([])
    expect(isOk(result) && result.value.size).toBe(0)
  })

  it('un error de la base, una fila inesperada o una excepción son un fallo, no un listado roto', async () => {
    const failed = await delinquencyStatesGateway(createFakeDb({ data: null, error: { message: 'boom' } }).db).statesFor([ANA])
    const malformed = await delinquencyStatesGateway(
      createFakeDb({ data: [{ client_id: ANA, state: 'dismissed', pending: 1 }], error: null }).db,
    ).statesFor([ANA])
    const thrown = await delinquencyStatesGateway(
      createFakeDb(() => {
        throw new Error('network down')
      }).db,
    ).statesFor([ANA])

    expect(isErr(failed)).toBe(true)
    expect(isErr(malformed)).toBe(true)
    expect(isErr(thrown)).toBe(true)
  })
})
