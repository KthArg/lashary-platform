import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import {
  APPROVE_REGULARIZATION_FUNCTION,
  REJECT_REGULARIZATION_FUNCTION,
  REVIEW_REFUSALS,
  regularizationReviewRepository,
} from '../regularization-review-repository'

type Response = { data: unknown; error: { message: string; code?: string } | null }

function createFakeDb(response: Response) {
  const calls: unknown[][] = []
  const db = {
    rpc: async (name: string, args: unknown) => (calls.push([name, args]), response),
  } as unknown as SupabaseClient
  return { db, calls }
}

describe('regularizationReviewRepository.approve', () => {
  it('llama a la función de la base con la solicitud y el monto, y devuelve el estado de la morosidad', async () => {
    const { db, calls } = createFakeDb({ data: 'settled', error: null })
    const result = await regularizationReviewRepository(db).approve('solicitud-1', 25000)

    expect(calls).toEqual([[APPROVE_REGULARIZATION_FUNCTION, { p_request_id: 'solicitud-1', p_approved_amount: 25000 }]])
    expect(isOk(result) && result.value).toBe('settled')
  })

  it.each(Object.entries(REVIEW_REFUSALS))('el mensaje %s de la base llega como el motivo %s', async (message, reason) => {
    const { db } = createFakeDb({ data: null, error: { message } })
    const result = await regularizationReviewRepository(db).approve('solicitud-1', 25000)

    expect(isErr(result) && result.error).toMatchObject({ code: 'DELINQUENCY_REVIEW_REFUSED', reason })
  })

  it('un estado inesperado o cualquier otro error es un fallo de almacenamiento', async () => {
    const strange = createFakeDb({ data: 'dismissed', error: null })
    const broken = createFakeDb({ data: null, error: { message: 'delinquency_not_admin', code: '42501' } })

    const first = await regularizationReviewRepository(strange.db).approve('solicitud-1', 25000)
    const second = await regularizationReviewRepository(broken.db).approve('solicitud-1', 25000)
    expect([isErr(first) && first.error.code, isErr(second) && second.error.code]).toEqual([
      'DELINQUENCY_STORAGE_FAILED',
      'DELINQUENCY_STORAGE_FAILED',
    ])
  })
})

describe('regularizationReviewRepository.reject', () => {
  it('llama a la función de la base con la solicitud y el motivo', async () => {
    const { db, calls } = createFakeDb({ data: null, error: null })
    const result = await regularizationReviewRepository(db).reject('solicitud-1', 'No se lee')

    expect(calls).toEqual([[REJECT_REGULARIZATION_FUNCTION, { p_request_id: 'solicitud-1', p_reason: 'No se lee' }]])
    expect(isOk(result)).toBe(true)
  })

  it('una solicitud ya revisada llega como tal', async () => {
    const { db } = createFakeDb({ data: null, error: { message: 'delinquency_regularization_not_pending', code: '55000' } })
    const result = await regularizationReviewRepository(db).reject('solicitud-1', 'No se lee')

    expect(isErr(result) && result.error).toMatchObject({ reason: 'request-not-pending' })
  })
})
