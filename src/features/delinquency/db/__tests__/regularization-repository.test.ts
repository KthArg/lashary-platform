import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import {
  MY_ACCOUNT_FUNCTION,
  regularizationRepository,
  SUBMIT_REFUSALS,
  SUBMIT_REGULARIZATION_FUNCTION,
} from '../regularization-repository'

type FakeResponse = { data: unknown; error: { message: string; code?: string } | null }

function createFakeDb(response: FakeResponse) {
  const calls: unknown[][] = []
  const db = {
    rpc: async (name: string, args?: unknown) => (calls.push(['rpc', name, args]), response),
  } as unknown as SupabaseClient
  return { db, calls }
}

const REQUEST_ID = '00000000-0000-0000-0000-0000000016f1'
const request = { caseId: 'morosidad-1', declaredAmount: 10000, reference: 'SINPE 44', receiptPath: 'c/r.pdf' }

const accountRow = {
  case_id: '00000000-0000-0000-0000-0000000016d1',
  case_state: 'active',
  appointment_id: '00000000-0000-0000-0000-0000000016e1',
  pending: 25000,
  since: '2026-11-07T15:00:00Z',
  request_id: REQUEST_ID,
  request_state: 'rejected',
  declared_amount: 10000,
  approved_amount: null,
  rejection_reason: 'El comprobante no se lee',
  reviewed_at: '2026-11-09T15:00:00Z',
}

describe('regularizationRepository.submit', () => {
  it('llama a la función de la base con la morosidad, lo declarado, la referencia y el comprobante', async () => {
    const { db, calls } = createFakeDb({ data: REQUEST_ID, error: null })
    const result = await regularizationRepository(db).submit(request)

    expect(calls).toEqual([
      ['rpc', SUBMIT_REGULARIZATION_FUNCTION, { p_case_id: 'morosidad-1', p_declared_amount: 10000, p_reference: 'SINPE 44', p_receipt_path: 'c/r.pdf' }],
    ])
    expect(isOk(result) && result.value).toBe(REQUEST_ID)
  })

  it.each(Object.entries(SUBMIT_REFUSALS))('el mensaje %s de la base llega como el rechazo %s', async (message, reason) => {
    const { db } = createFakeDb({ data: null, error: { message, code: '22023' } })
    const result = await regularizationRepository(db).submit(request)

    expect(isErr(result) && result.error).toMatchObject({ code: 'DELINQUENCY_REGULARIZATION_REFUSED', reason })
  })

  it('una sesión que no es de clienta llega como tal', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'delinquency_not_a_client', code: '42501' } })
    const result = await regularizationRepository(db).submit(request)

    expect(isErr(result) && result.error.code).toBe('DELINQUENCY_NOT_A_CLIENT')
  })

  it('cualquier otro error es un fallo de almacenamiento', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'connection refused' } })
    const result = await regularizationRepository(db).submit(request)

    expect(isErr(result) && result.error.code).toBe('DELINQUENCY_STORAGE_FAILED')
  })
})

describe('regularizationRepository.myAccount', () => {
  it('lee el estado de cuenta con la solicitud más reciente de cada morosidad', async () => {
    const { db, calls } = createFakeDb({ data: [accountRow], error: null })
    const result = await regularizationRepository(db).myAccount()

    expect(calls).toEqual([['rpc', MY_ACCOUNT_FUNCTION, undefined]])
    expect(isOk(result) && result.value).toEqual([
      {
        caseId: accountRow.case_id,
        caseState: 'active',
        appointmentId: accountRow.appointment_id,
        pending: 25000,
        since: new Date('2026-11-07T15:00:00Z'),
        request: {
          id: REQUEST_ID,
          state: 'rejected',
          declaredAmount: 10000,
          approvedAmount: null,
          rejectionReason: 'El comprobante no se lee',
          reviewedAt: new Date('2026-11-09T15:00:00Z'),
        },
      },
    ])
  })

  it('una morosidad sin solicitudes sale sin solicitud', async () => {
    const row = { ...accountRow, request_id: null, request_state: null, declared_amount: null, rejection_reason: null, reviewed_at: null }
    const { db } = createFakeDb({ data: [row], error: null })
    const result = await regularizationRepository(db).myAccount()

    expect(isOk(result) && result.value[0].request).toBeNull()
  })

  it('una fila con un estado desconocido es un fallo, no un estado de cuenta inventado', async () => {
    const { db } = createFakeDb({ data: [{ ...accountRow, case_state: 'dismissed' }], error: null })
    const result = await regularizationRepository(db).myAccount()

    expect(isErr(result) && result.error.code).toBe('DELINQUENCY_STORAGE_FAILED')
  })
})
