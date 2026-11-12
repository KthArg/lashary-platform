import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { isDelinquencyStorageFailed, isInvalidGraceDays } from '../../domain/errors'
import { settingsRepository, SETTINGS_TABLE, SET_GRACE_DAYS_FUNCTION } from '../settings-repository'

type FakeResponse = { data: unknown; error: { message: string; code?: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = { then: (resolve: (value: FakeResponse) => unknown) => resolve(response) }
  for (const method of ['select', 'single']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = {
    from: (table: string) => (calls.push(['from', table]), query),
    rpc: async (name: string, args: unknown) => (calls.push(['rpc', name, args]), response),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('settingsRepository.graceDays', () => {
  it('lee la gracia de la fila única de configuración', async () => {
    const { db, calls } = createFakeDb({ data: { grace_days: 7 }, error: null })

    const result = await settingsRepository(db).graceDays()

    expect(calls).toEqual([['from', SETTINGS_TABLE], ['select', 'grace_days'], ['single']])
    expect(isOk(result) && result.value).toBe(7)
  })

  it('un error de la base es un fallo de almacenamiento, no una gracia inventada', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'caída' } })

    const result = await settingsRepository(db).graceDays()

    expect(isErr(result) && isDelinquencyStorageFailed(result.error)).toBe(true)
  })

  it.each([[null], [{}], [{ grace_days: '7' }], [{ grace_days: 7.5 }]])(
    'una fila con forma inesperada (%o) es un fallo',
    async (data) => {
      const { db } = createFakeDb({ data, error: null })

      const result = await settingsRepository(db).graceDays()

      expect(isErr(result) && isDelinquencyStorageFailed(result.error)).toBe(true)
    },
  )
})

describe('settingsRepository.setGraceDays', () => {
  it('llama a la función de la base con los días y devuelve el valor que quedó', async () => {
    const { db, calls } = createFakeDb({ data: 14, error: null })

    const result = await settingsRepository(db).setGraceDays(14)

    expect(calls).toEqual([['rpc', SET_GRACE_DAYS_FUNCTION, { p_days: 14 }]])
    expect(isOk(result) && result.value).toBe(14)
  })

  it('traduce el rechazo de la base por un valor fuera de rango', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'delinquency_invalid_grace_days', code: '22023' } })

    const result = await settingsRepository(db).setGraceDays(91)

    expect(isErr(result) && isInvalidGraceDays(result.error)).toBe(true)
  })

  it('cualquier otro error de la base es un fallo de almacenamiento', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'permission denied', code: '42501' } })

    const result = await settingsRepository(db).setGraceDays(10)

    expect(isErr(result) && isDelinquencyStorageFailed(result.error)).toBe(true)
  })

  it.each([[null], ['14'], [1.5]])('una respuesta con forma inesperada (%o) es un fallo', async (data) => {
    const { db } = createFakeDb({ data, error: null })

    const result = await settingsRepository(db).setGraceDays(14)

    expect(isErr(result) && isDelinquencyStorageFailed(result.error)).toBe(true)
  })
})
