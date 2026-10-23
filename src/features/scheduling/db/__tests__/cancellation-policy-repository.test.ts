import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseCancellationPolicyRepository } from '../cancellation-policy-repository'
import {
  CANCELLATION_POLICY_TABLE,
  CANCELLATION_WINDOW_COLUMN,
  CHANGE_CANCELLATION_WINDOW_FUNCTION,
  INVALID_CANCELLATION_WINDOW_MESSAGE,
  POLICY_SINGLETON_COLUMN,
} from '../cancellation-policy-repository.constants'

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: Array<[string, ...unknown[]]> = []
  const query = {
    select: (columns: string) => (calls.push(['select', columns]), query),
    eq: (column: string, value: unknown) => (calls.push(['eq', column, value]), query),
    maybeSingle: async () => (calls.push(['maybeSingle']), response),
  }
  const db = {
    from: (table: string) => (calls.push(['from', table]), query),
    rpc: async (functionName: string, args: unknown) => (calls.push(['rpc', functionName, args]), response),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabaseCancellationPolicyRepository', () => {
  describe('getWindowHours', () => {
    it('lee la fila única de la política', async () => {
      const { db, calls } = createFakeDb({ data: { cancellation_window_hours: 48 }, error: null })
      const result = await createSupabaseCancellationPolicyRepository(db).getWindowHours()

      expect(calls).toEqual([
        ['from', CANCELLATION_POLICY_TABLE],
        ['select', CANCELLATION_WINDOW_COLUMN],
        ['eq', POLICY_SINGLETON_COLUMN, true],
        ['maybeSingle'],
      ])
      expect(isOk(result) && result.value).toBe(48)
    })

    it.each([[{ data: null, error: { message: 'caída' } }], [{ data: null, error: null }]])(
      'un fallo o una política ausente es StorageFailed (%o)',
      async (response) => {
        const { db } = createFakeDb(response)
        const result = await createSupabaseCancellationPolicyRepository(db).getWindowHours()

        expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
      },
    )
  })

  describe('changeWindowHours', () => {
    it('llama a la función SQL con las horas y devuelve el valor anterior y el nuevo', async () => {
      const { db, calls } = createFakeDb({ data: [{ previous_hours: 48, new_hours: 24 }], error: null })
      const result = await createSupabaseCancellationPolicyRepository(db).changeWindowHours(24)

      expect(calls).toEqual([['rpc', CHANGE_CANCELLATION_WINDOW_FUNCTION, { p_hours: 24 }]])
      expect(isOk(result) && result.value).toEqual({ previousHours: 48, newHours: 24 })
    })

    it('el rechazo de la base por la cifra llega como InvalidCancellationWindow', async () => {
      const { db } = createFakeDb({ data: null, error: { message: INVALID_CANCELLATION_WINDOW_MESSAGE } })
      const result = await createSupabaseCancellationPolicyRepository(db).changeWindowHours(100000)

      expect(isErr(result) && result.error.code).toBe('SCHEDULING_INVALID_CANCELLATION_WINDOW')
    })

    it('cualquier otro error de la base es StorageFailed', async () => {
      const { db } = createFakeDb({ data: null, error: { message: 'scheduling_not_admin' } })
      const result = await createSupabaseCancellationPolicyRepository(db).changeWindowHours(24)

      expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
    })

    it('sin filas no lo da por guardado', async () => {
      const { db } = createFakeDb({ data: [], error: null })
      const result = await createSupabaseCancellationPolicyRepository(db).changeWindowHours(24)

      expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
    })
  })
})
