import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseCancellationPolicyRepository } from '../cancellation-policy-repository'
import {
  CANCELLATION_POLICY_TABLE,
  CANCELLATION_WINDOW_COLUMN,
  POLICY_SINGLETON_COLUMN,
} from '../cancellation-policy-repository.constants'

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: Array<[string, ...unknown[]]> = []
  const query = {
    select: (columns: string) => (calls.push(['select', columns]), query),
    update: (values: unknown) => (calls.push(['update', values]), query),
    eq: (column: string, value: unknown) => (calls.push(['eq', column, value]), query),
    maybeSingle: async () => (calls.push(['maybeSingle']), response),
    then: (resolve: (value: FakeResponse) => unknown) => resolve(response),
  }
  const db = { from: (table: string) => (calls.push(['from', table]), query) } as unknown as SupabaseClient
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

  describe('setWindowHours', () => {
    it('actualiza solo esa columna de la fila única', async () => {
      const { db, calls } = createFakeDb({ data: [{ cancellation_window_hours: 24 }], error: null })
      const result = await createSupabaseCancellationPolicyRepository(db).setWindowHours(24)

      expect(calls).toEqual([
        ['from', CANCELLATION_POLICY_TABLE],
        ['update', { [CANCELLATION_WINDOW_COLUMN]: 24 }],
        ['eq', POLICY_SINGLETON_COLUMN, true],
        ['select', CANCELLATION_WINDOW_COLUMN],
      ])
      expect(isOk(result)).toBe(true)
    })

    it('si la RLS no deja actualizar ninguna fila no lo da por guardado', async () => {
      const { db } = createFakeDb({ data: [], error: null })
      const result = await createSupabaseCancellationPolicyRepository(db).setWindowHours(24)

      expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
    })

    it('un error de la base es StorageFailed', async () => {
      const { db } = createFakeDb({ data: null, error: { message: 'caída' } })
      const result = await createSupabaseCancellationPolicyRepository(db).setWindowHours(24)

      expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
    })
  })
})
