import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import {
  APPOINTMENT_BALANCES_FUNCTION,
  REGULARIZATIONS_TABLE,
  regularizationQueueRepository,
} from '../regularization-queue-repository'

type Response = { data: unknown; error: { message: string } | null }

function createFakeDb(table: Response, balances: Response = { data: [], error: null }) {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = { then: (resolve: (value: Response) => unknown) => resolve(table) }
  for (const method of ['select', 'eq', 'order', 'limit']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  const db = {
    from: (name: string) => (calls.push(['from', name]), query),
    rpc: async (name: string, args: unknown) => (calls.push(['rpc', name, args]), balances),
  } as unknown as SupabaseClient
  return { db, calls }
}

const APPOINTMENT = '00000000-0000-4000-8000-0000000016e1'
const row = {
  id: '00000000-0000-4000-8000-0000000016f1',
  case_id: '00000000-0000-4000-8000-0000000016d1',
  client_id: '00000000-0000-4000-8000-0000000016c2',
  declared_amount: 10000,
  reference: 'SINPE 44',
  receipt_path: '00000000-0000-4000-8000-0000000016c2/r.pdf',
  created_at: '2026-11-10T15:00:00Z',
  delinquency_cases: { appointment_id: APPOINTMENT },
}

describe('regularizationQueueRepository.listPending', () => {
  it('lee las pendientes de la más antigua a la más nueva y pide el saldo de hoy de sus citas de una vez', async () => {
    const { db, calls } = createFakeDb({ data: [row], error: null }, { data: [{ appointment_id: APPOINTMENT, pending: 25000 }], error: null })
    const result = await regularizationQueueRepository(db).listPending(51)

    expect(calls[0]).toEqual(['from', REGULARIZATIONS_TABLE])
    expect(calls).toContainEqual(['eq', 'state', 'pending_approval'])
    expect(calls).toContainEqual(['order', 'created_at', { ascending: true }])
    expect(calls).toContainEqual(['limit', 51])
    expect(calls.at(-1)).toEqual(['rpc', APPOINTMENT_BALANCES_FUNCTION, { p_appointment_ids: [APPOINTMENT] }])
    expect(isOk(result) && result.value).toEqual([
      {
        requestId: row.id,
        caseId: row.case_id,
        clientId: row.client_id,
        declaredAmount: 10000,
        reference: 'SINPE 44',
        receiptPath: row.receipt_path,
        pendingToday: 25000,
        submittedAt: new Date('2026-11-10T15:00:00Z'),
      },
    ])
  })

  it('sin pendientes no pide saldos', async () => {
    const { db, calls } = createFakeDb({ data: [], error: null })
    const result = await regularizationQueueRepository(db).listPending(51)

    expect(isOk(result) && result.value).toEqual([])
    expect(calls.some((call) => call[0] === 'rpc')).toBe(false)
  })

  it('un error al leer la tabla o los saldos es un fallo de almacenamiento', async () => {
    const tableFails = createFakeDb({ data: null, error: { message: 'caída' } })
    const balancesFail = createFakeDb({ data: [row], error: null }, { data: null, error: { message: 'caída' } })

    expect(isErr(await regularizationQueueRepository(tableFails.db).listPending(51))).toBe(true)
    expect(isErr(await regularizationQueueRepository(balancesFail.db).listPending(51))).toBe(true)
  })

  it('una fila con forma inesperada es un fallo, no una cola inventada', async () => {
    const { db } = createFakeDb({ data: [{ ...row, delinquency_cases: null }], error: null })
    const result = await regularizationQueueRepository(db).listPending(51)

    expect(isErr(result) && result.error.code).toBe('DELINQUENCY_STORAGE_FAILED')
  })
})
