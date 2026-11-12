import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { CLIENT_STATES_FUNCTION, createSupabaseDelinquentClientsPort } from '../delinquent-clients-repository'

const ANA = '1c9d1f0e-5a4b-4e0e-8d52-0d6a3e6f9a21'
const LUCIA = '3e8f3b2a-7c6d-4a2a-8f74-2f8c5a8b1c43'
const ROSA = '5a7c9e1b-2d4f-4a6b-8c0d-1e3f5a7b9c2d'

function createFakeDb(response: { data: unknown; error: { message: string } | null }) {
  const calls: unknown[][] = []
  const db = {
    rpc: async (name: string, args: unknown) => (calls.push([name, args]), response),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabaseDelinquentClientsPort.listWithActiveDelinquency', () => {
  it('pide el estado de todas las clientas del día en una sola llamada', async () => {
    const { db, calls } = createFakeDb({ data: [], error: null })

    await createSupabaseDelinquentClientsPort(db).listWithActiveDelinquency([ANA, LUCIA, ROSA])

    expect(calls).toEqual([[CLIENT_STATES_FUNCTION, { p_client_ids: [ANA, LUCIA, ROSA] }]])
  })

  it('solo las morosidades confirmadas cuentan: una por revisar no marca a la clienta', async () => {
    const { db } = createFakeDb({
      data: [
        { client_id: ANA, state: 'active', pending: 20000, since: '2026-11-01T10:00:00+00:00' },
        { client_id: LUCIA, state: 'pending_review', pending: 9000, since: '2026-11-02T10:00:00+00:00' },
      ],
      error: null,
    })

    const result = await createSupabaseDelinquentClientsPort(db).listWithActiveDelinquency([ANA, LUCIA, ROSA])

    expect(isOk(result) && [...result.value]).toEqual([ANA])
  })

  it('acepta cualquier uuid de la base, no solo los versión 4', async () => {
    const odd = '00000000-0000-0000-0000-00000000ee01'
    const { db } = createFakeDb({ data: [{ client_id: odd, state: 'active' }], error: null })

    const result = await createSupabaseDelinquentClientsPort(db).listWithActiveDelinquency([odd])

    expect(isOk(result) && [...result.value]).toEqual([odd])
  })

  it('un día sin clientas no llama a la base', async () => {
    const { db, calls } = createFakeDb({ data: [], error: null })

    const result = await createSupabaseDelinquentClientsPort(db).listWithActiveDelinquency([])

    expect(calls).toEqual([])
    expect(isOk(result) && result.value.size).toBe(0)
  })

  it.each([
    ['un error de la base', { data: null, error: { message: 'caída' } }],
    ['una respuesta con forma inesperada', { data: [{ client_id: 'no-uuid', state: 'active' }], error: null }],
  ])('%s es un fallo de almacenamiento, no una agenda sin morosas', async (_name, response) => {
    const { db } = createFakeDb(response)

    const result = await createSupabaseDelinquentClientsPort(db).listWithActiveDelinquency([ANA])

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
