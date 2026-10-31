import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseReschedulePolicyRepository } from '../reschedule-policy-repository'
import {
  CHANGE_RESCHEDULE_LIMIT_FUNCTION,
  INVALID_RESCHEDULE_LIMIT_MESSAGE,
  MAX_RESCHEDULES_COLUMN,
  RESCHEDULE_POLICY_SINGLETON_COLUMN,
  RESCHEDULE_POLICY_TABLE,
} from '../reschedule-policy-repository.constants'

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

describe('createSupabaseReschedulePolicyRepository', () => {
  describe('getMaxReschedules', () => {
    it('lee la columna del tope de la fila única de la política', async () => {
      const { db, calls } = createFakeDb({ data: { max_reschedules: 1 }, error: null })
      const result = await createSupabaseReschedulePolicyRepository(db).getMaxReschedules()

      expect(isOk(result) && result.value).toBe(1)
      expect(calls).toEqual([
        ['from', RESCHEDULE_POLICY_TABLE],
        ['select', MAX_RESCHEDULES_COLUMN],
        ['eq', RESCHEDULE_POLICY_SINGLETON_COLUMN, true],
        ['maybeSingle'],
      ])
    })

    it('un error de la base o una política que no existe son StorageFailed', async () => {
      const failing = await createSupabaseReschedulePolicyRepository(
        createFakeDb({ data: null, error: { message: 'caída' } }).db,
      ).getMaxReschedules()
      const missing = await createSupabaseReschedulePolicyRepository(
        createFakeDb({ data: null, error: null }).db,
      ).getMaxReschedules()

      expect(isErr(failing) && failing.error.code).toBe('SCHEDULING_STORAGE_FAILED')
      expect(isErr(missing) && missing.error.code).toBe('SCHEDULING_STORAGE_FAILED')
    })
  })

  describe('changeMaxReschedules', () => {
    it('llama a la función SQL y devuelve el valor anterior y el nuevo', async () => {
      const { db, calls } = createFakeDb({ data: [{ previous_max: 1, new_max: 3 }], error: null })
      const result = await createSupabaseReschedulePolicyRepository(db).changeMaxReschedules(3)

      expect(calls).toEqual([['rpc', CHANGE_RESCHEDULE_LIMIT_FUNCTION, { p_max: 3 }]])
      expect(isOk(result) && result.value).toEqual({ previousMax: 1, newMax: 3 })
    })

    it('el rechazo de la base por cifra inválida llega como su error tipado', async () => {
      const { db } = createFakeDb({ data: null, error: { message: INVALID_RESCHEDULE_LIMIT_MESSAGE } })
      const result = await createSupabaseReschedulePolicyRepository(db).changeMaxReschedules(99)

      expect(isErr(result) && result.error).toMatchObject({ code: 'SCHEDULING_INVALID_RESCHEDULE_LIMIT', max: 99 })
    })

    it('cualquier otro error de la base es StorageFailed, y sin filas también', async () => {
      const failing = await createSupabaseReschedulePolicyRepository(
        createFakeDb({ data: null, error: { message: 'scheduling_not_admin' } }).db,
      ).changeMaxReschedules(2)
      const empty = await createSupabaseReschedulePolicyRepository(
        createFakeDb({ data: [], error: null }).db,
      ).changeMaxReschedules(2)

      expect(isErr(failing) && failing.error.code).toBe('SCHEDULING_STORAGE_FAILED')
      expect(isErr(empty) && empty.error.code).toBe('SCHEDULING_STORAGE_FAILED')
    })
  })
})
