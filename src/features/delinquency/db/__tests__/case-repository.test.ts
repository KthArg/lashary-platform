import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { isCaseAlreadyDecided, isCaseNotFound, isDelinquencyStorageFailed } from '../../domain/errors'
import { caseRepository, DECIDE_CASE_FUNCTION } from '../case-repository'

const CASE_ID = '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11'

const row = {
  id: CASE_ID,
  client_id: '1c9d1f0e-5a4b-4e0e-8d52-0d6a3e6f9a21',
  appointment_id: '2d7e2a1f-6b5c-4f1f-9e63-1e7b4f7a0b32',
  pending: 20000,
  state: 'active',
  detected_at: '2026-11-01T15:00:00+00:00',
  decided_at: '2026-11-06T15:00:00+00:00',
}

type FakeResponse = { data: unknown; error: { message: string; code?: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const db = {
    rpc: async (name: string, args: unknown) => (calls.push([name, args]), response),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('caseRepository.decide', () => {
  it('llama a la función de la base con la morosidad y la decisión, y convierte las fechas', async () => {
    const { db, calls } = createFakeDb({ data: row, error: null })

    const result = await caseRepository(db).decide(CASE_ID, 'confirm')

    expect(calls).toEqual([[DECIDE_CASE_FUNCTION, { p_case_id: CASE_ID, p_decision: 'confirm' }]])
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value.state).toBe('active')
      expect(result.value.pending).toBe(20000)
      expect(result.value.detectedAt).toEqual(new Date('2026-11-01T15:00:00Z'))
      expect(result.value.decidedAt).toEqual(new Date('2026-11-06T15:00:00Z'))
    }
  })

  it('traduce el código de la base a «no existe» y «ya se decidió»', async () => {
    const missing = await caseRepository(
      createFakeDb({ data: null, error: { message: 'delinquency_case_not_found', code: 'P0002' } }).db,
    ).decide(CASE_ID, 'confirm')
    const decided = await caseRepository(
      createFakeDb({ data: null, error: { message: 'delinquency_case_already_decided', code: '55000' } }).db,
    ).decide(CASE_ID, 'dismiss')

    expect(isErr(missing) && isCaseNotFound(missing.error)).toBe(true)
    expect(isErr(decided) && isCaseAlreadyDecided(decided.error)).toBe(true)
  })

  it('cualquier otro error de la base es un fallo de almacenamiento', async () => {
    const result = await caseRepository(
      createFakeDb({ data: null, error: { message: 'connection reset', code: '08006' } }).db,
    ).decide(CASE_ID, 'confirm')

    expect(isErr(result) && isDelinquencyStorageFailed(result.error)).toBe(true)
  })

  it('una fila con forma inesperada es un error que no guarda el texto de la base', async () => {
    const result = await caseRepository(createFakeDb({ data: { ...row, state: 'borrada' }, error: null }).db).decide(
      CASE_ID,
      'confirm',
    )

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.message).not.toContain('borrada')
  })
})
