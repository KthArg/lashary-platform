import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { droppedNoticesRepository, RECONCILE_DROPPED_NOTICES_FUNCTION } from '../dropped-notices-repository'

type FakeResponse = { data?: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const db = { rpc: async (name: string) => (calls.push(['rpc', name]), response) } as unknown as SupabaseClient
  return { db, calls }
}

describe('droppedNoticesRepository', () => {
  it('llama a la función de reintento y devuelve cuántos resolvió y cuántos siguen abiertos', async () => {
    const { db, calls } = createFakeDb({ data: [{ resolved: 2, still_open: 1 }], error: null })

    const result = await droppedNoticesRepository(db).reconcile()

    expect(calls).toEqual([['rpc', RECONCILE_DROPPED_NOTICES_FUNCTION]])
    expect(isOk(result) && result.value).toEqual({ resolved: 2, open: 1 })
  })

  it('un fallo de la base es un error', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'sin conexión' } })
    expect(isErr(await droppedNoticesRepository(db).reconcile())).toBe(true)
  })

  it('una respuesta con otra forma es un error, nunca ceros', async () => {
    for (const data of [[], [{ resolved: 'dos', still_open: 1 }], [{ resolved: 1 }], null, { resolved: 1, still_open: 0 }]) {
      const { db } = createFakeDb({ data, error: null })
      expect(isErr(await droppedNoticesRepository(db).reconcile())).toBe(true)
    }
  })
})
