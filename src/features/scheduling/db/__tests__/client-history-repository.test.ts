import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseClientHistory } from '../client-history-repository'
import { HAS_COMPLETED_APPOINTMENT_FUNCTION } from '../client-history-repository.constants'

const TECHNIQUE_ID = 'tecnica-clasicas'

type FakeResponse = { data: boolean | null; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: Array<{ functionName: string; args: unknown }> = []
  const db = {
    rpc: async (functionName: string, args: unknown) => {
      calls.push({ functionName, args })
      return response
    },
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabaseClientHistory', () => {
  it.each([[true], [false]])('llama a la función SQL solo con la técnica y devuelve %s', async (hasCompleted) => {
    const { db, calls } = createFakeDb({ data: hasCompleted, error: null })
    const result = await createSupabaseClientHistory(db).hasCompletedAppointment(TECHNIQUE_ID)

    expect(calls).toEqual([
      { functionName: HAS_COMPLETED_APPOINTMENT_FUNCTION, args: { p_technique_id: TECHNIQUE_ID } },
    ])
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toBe(hasCompleted)
  })

  it('un fallo de la base es StorageFailed, no «sin historial»', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'connection refused' } })
    const result = await createSupabaseClientHistory(db).hasCompletedAppointment(TECHNIQUE_ID)

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
