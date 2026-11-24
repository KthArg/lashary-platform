import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { DELINQUENCY_ERROR_CODES } from '../../domain/errors'
import { CASES_TABLE } from '../case-list-repository'
import { APPOINTMENT_BALANCES_FUNCTION, REGULARIZATIONS_TABLE } from '../regularization-queue-repository'
import { CASE_DETAIL_COLUMNS, caseDetailRepository } from '../case-detail-repository'

type Response = { data: unknown; error: { message: string } | null }

function createFakeDb(table: Response, balances: Response = { data: [], error: null }) {
  const calls: unknown[][] = []
  const query: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'order']) {
    query[method] = (...args: unknown[]) => (calls.push([method, ...args]), query)
  }
  query.maybeSingle = async () => (calls.push(['maybeSingle']), table)
  const db = {
    from: (name: string) => (calls.push(['from', name]), query),
    rpc: async (name: string, args: unknown) => (calls.push(['rpc', name, args]), balances),
  } as unknown as SupabaseClient
  return { db, calls }
}

const CASE_ID = '00000000-0000-4000-8000-0000000018d1'
const APPOINTMENT = '00000000-0000-4000-8000-0000000018e1'
const request = {
  id: '00000000-0000-4000-8000-0000000018f1',
  state: 'approved',
  declared_amount: 10000,
  reference: 'SINPE 44',
  approved_amount: 10000,
  rejection_reason: null,
  created_at: '2026-11-12T15:00:00Z',
  reviewed_at: '2026-11-13T15:00:00Z',
}
const row = {
  id: CASE_ID,
  client_id: '00000000-0000-4000-8000-0000000018c1',
  appointment_id: APPOINTMENT,
  pending: 20000,
  state: 'forgiven',
  detected_at: '2026-11-10T15:00:00Z',
  decided_at: '2026-11-11T15:00:00Z',
  settled_at: null,
  exception_reason: 'Acuerdo con la clienta',
  exception_amount: 5000,
  delinquency_regularizations: [request],
}
const todayBalance = { data: [{ appointment_id: APPOINTMENT, pending: 12000 }], error: null }

async function failureCode(db: SupabaseClient): Promise<string | null> {
  const result = await caseDetailRepository(db).find(CASE_ID)
  return isErr(result) ? result.error.code : null
}

describe('caseDetailRepository.find', () => {
  it('lee la morosidad por id con sus solicitudes, la más reciente primero, y pide el saldo de su cita', async () => {
    const { db, calls } = createFakeDb({ data: row, error: null }, todayBalance)
    await caseDetailRepository(db).find(CASE_ID)

    expect(calls[0]).toEqual(['from', CASES_TABLE])
    expect(calls).toContainEqual(['select', CASE_DETAIL_COLUMNS])
    expect(calls).toContainEqual(['eq', 'id', CASE_ID])
    expect(calls).toContainEqual(['order', 'created_at', { ascending: false, referencedTable: REGULARIZATIONS_TABLE }])
    expect(calls.at(-1)).toEqual(['rpc', APPOINTMENT_BALANCES_FUNCTION, { p_appointment_ids: [APPOINTMENT] }])
  })

  it('no pide el comprobante de las solicitudes', () => {
    expect(CASE_DETAIL_COLUMNS).not.toContain('receipt_path')
  })

  it('mapea la morosidad con su excepción, sus solicitudes y el saldo de hoy', async () => {
    const { db } = createFakeDb({ data: row, error: null }, todayBalance)
    const result = await caseDetailRepository(db).find(CASE_ID)

    expect(isOk(result) && result.value).toEqual({
      caseId: CASE_ID,
      clientId: row.client_id,
      appointmentId: APPOINTMENT,
      pending: 20000,
      pendingToday: 12000,
      state: 'forgiven',
      detectedAt: new Date(row.detected_at),
      decidedAt: new Date('2026-11-11T15:00:00Z'),
      settledAt: null,
      exceptionReason: 'Acuerdo con la clienta',
      exceptionAmount: 5000,
      requests: [
        {
          id: request.id,
          state: 'approved',
          declaredAmount: 10000,
          reference: 'SINPE 44',
          approvedAmount: 10000,
          rejectionReason: null,
          createdAt: new Date(request.created_at),
          reviewedAt: new Date('2026-11-13T15:00:00Z'),
        },
      ],
    })
  })

  it('sin fila de saldo el saldo de hoy es cero, y sin solicitudes la lista va vacía', async () => {
    const { db } = createFakeDb({ data: { ...row, delinquency_regularizations: [] }, error: null })
    const result = await caseDetailRepository(db).find(CASE_ID)

    expect(isOk(result) && result.value.pendingToday).toBe(0)
    expect(isOk(result) && result.value.requests).toEqual([])
  })

  it('una morosidad que no existe es no encontrada y no consulta el saldo', async () => {
    const { db, calls } = createFakeDb({ data: null, error: null })

    expect(await failureCode(db)).toBe(DELINQUENCY_ERROR_CODES.caseNotFound)
    expect(calls.some((call) => call[0] === 'rpc')).toBe(false)
  })

  it('un error al leer la tabla o el saldo, o una fila inválida, es un fallo de almacenamiento', async () => {
    const caida = { data: null, error: { message: 'caída' } }
    const dbs = [
      createFakeDb(caida),
      createFakeDb({ data: row, error: null }, caida),
      createFakeDb({ data: { ...row, state: 'inventado' }, error: null }),
      createFakeDb({ data: row, error: null }, { data: [{ appointment_id: 'x' }], error: null }),
    ]

    for (const { db } of dbs) {
      expect(await failureCode(db)).toBe(DELINQUENCY_ERROR_CODES.storageFailed)
    }
  })
})
