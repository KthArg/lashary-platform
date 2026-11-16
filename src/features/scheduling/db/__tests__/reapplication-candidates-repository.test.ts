import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { createSupabaseReapplicationCandidatesRepository, REAPPLICATION_CANDIDATES_FUNCTION } from '../reapplication-candidates-repository'

const CLIENT_ID = 'a1b2c3d4-0000-4000-8000-000000000001'
const TECHNIQUE_ID = 'a1b2c3d4-0000-4000-8000-000000000002'

type FakeResponse = { data: unknown; error: { message: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: Array<{ functionName: string; args: unknown }> = []
  const db = {
    rpc: async (functionName: string, args?: unknown) => {
      calls.push({ functionName, args })
      return response
    },
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('createSupabaseReapplicationCandidatesRepository', () => {
  it('llama a la función sin argumentos y mapea las filas', async () => {
    const { db, calls } = createFakeDb({
      data: [{ client_id: CLIENT_ID, technique_id: TECHNIQUE_ID, last_completed_at: '2026-09-01T17:00:00Z' }],
      error: null,
    })

    const result = await createSupabaseReapplicationCandidatesRepository(db).listCandidates()

    expect(calls).toEqual([{ functionName: REAPPLICATION_CANDIDATES_FUNCTION, args: undefined }])
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual([
        { clientId: CLIENT_ID, techniqueId: TECHNIQUE_ID, lastCompletedAt: new Date('2026-09-01T17:00:00Z') },
      ])
    }
  })

  it('sin candidatos devuelve una lista vacía', async () => {
    const { db } = createFakeDb({ data: [], error: null })
    const result = await createSupabaseReapplicationCandidatesRepository(db).listCandidates()

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toEqual([])
  })

  it('un fallo de la base es StorageFailed', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'connection refused' } })
    const result = await createSupabaseReapplicationCandidatesRepository(db).listCandidates()

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })

  it('una fila con forma inválida es StorageFailed, no un candidato a medias', async () => {
    const { db } = createFakeDb({ data: [{ client_id: CLIENT_ID }], error: null })
    const result = await createSupabaseReapplicationCandidatesRepository(db).listCandidates()

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
