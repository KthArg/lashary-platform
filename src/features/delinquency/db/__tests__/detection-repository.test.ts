import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { isDelinquencyStorageFailed } from '../../domain/errors'
import { detectionRepository, DETECT_UNPAID_FUNCTION } from '../detection-repository'

type FakeResponse = { data: unknown; error: { message: string; code?: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const db = {
    rpc: async (name: string, ...rest: unknown[]) => (calls.push([name, ...rest]), response),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('detectionRepository.detectUnpaid', () => {
  it('llama a la función de la base sin argumentos y devuelve cuántas generó', async () => {
    const { db, calls } = createFakeDb({ data: 4, error: null })

    const result = await detectionRepository(db).detectUnpaid()

    expect(calls).toEqual([[DETECT_UNPAID_FUNCTION]])
    expect(isOk(result) && result.value).toBe(4)
  })

  it('un error de la base es un fallo de almacenamiento con su mensaje', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'permission denied', code: '42501' } })

    const result = await detectionRepository(db).detectUnpaid()

    expect(isErr(result) && isDelinquencyStorageFailed(result.error)).toBe(true)
    expect(isErr(result) && result.error.message).toBe('permission denied')
  })

  it.each([[null], ['3'], [-1], [1.5]])(
    'una respuesta con forma inesperada (%o) es un fallo, no un número inventado',
    async (data) => {
      const { db } = createFakeDb({ data, error: null })

      const result = await detectionRepository(db).detectUnpaid()

      expect(isErr(result) && isDelinquencyStorageFailed(result.error)).toBe(true)
    },
  )
})
