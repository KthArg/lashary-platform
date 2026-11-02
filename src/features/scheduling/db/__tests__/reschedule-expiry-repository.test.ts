import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseRescheduleExpiryRepository } from '../reschedule-expiry-repository'
import { EXPIRE_UNDECIDED_RESCHEDULES_FUNCTION } from '../reschedule-repository.constants'

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: Array<[string, unknown]> = []
  const db = {
    rpc: async (functionName: string, args: unknown) => (calls.push([functionName, args]), response),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabaseRescheduleExpiryRepository', () => {
  it('llama a la función SQL sin parámetros y devuelve cuántos reagendados venció', async () => {
    const { db, calls } = createFakeDb({ data: 2, error: null })
    const result = await createSupabaseRescheduleExpiryRepository(db).expireUndecided()

    expect(calls).toEqual([[EXPIRE_UNDECIDED_RESCHEDULES_FUNCTION, undefined]])
    expect(isOk(result) && result.value).toBe(2)
  })

  it('un fallo de la base es StorageFailed', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'scheduling_not_staff' } })
    const result = await createSupabaseRescheduleExpiryRepository(db).expireUndecided()

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
