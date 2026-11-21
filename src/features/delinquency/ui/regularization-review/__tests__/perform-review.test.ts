import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { delinquencyStorageFailed, reviewRefused } from '@/features/delinquency/domain/errors'
import { decisionMessages, reviewRefusalMessages } from '../constants/queue-strings'
import { performApprove, performReject, type ReviewDeps } from '../utils/perform-review'

const REQUEST_ID = '00000000-0000-4000-8000-0000000016f1'

function createDeps(overrides: Partial<ReviewDeps> = {}) {
  const calls: unknown[] = []
  const deps: ReviewDeps = {
    approve: async (input) => (calls.push(['approve', input]), ok('settled')),
    reject: async (input) => (calls.push(['reject', input]), ok(undefined)),
    ...overrides,
  }
  return { deps, calls }
}

describe('performApprove', () => {
  it('aprueba con el monto como número y dice que la morosidad quedó saldada', async () => {
    const { deps, calls } = createDeps()
    const result = await performApprove({ requestId: REQUEST_ID, approvedAmount: '25000' }, deps)

    expect(result).toEqual({ ok: true, message: decisionMessages.approvedSettled })
    expect(calls).toEqual([['approve', { requestId: REQUEST_ID, approvedAmount: 25000 }]])
  })

  it('un pago parcial dice que la morosidad sigue activa', async () => {
    const { deps } = createDeps({ approve: async () => ok('active') })
    expect(await performApprove({ requestId: REQUEST_ID, approvedAmount: '4000' }, deps)).toEqual({
      ok: true,
      message: decisionMessages.approvedPartial,
    })
  })

  it.each([[''], ['abc'], ['10.5'], ['-3']])('un monto de «%s» no se envía', async (approvedAmount) => {
    const { deps, calls } = createDeps()
    const result = await performApprove({ requestId: REQUEST_ID, approvedAmount }, deps)

    expect(result).toEqual({ ok: false, message: reviewRefusalMessages['approved-amount-invalid'] })
    expect(calls).toEqual([])
  })

  it('una solicitud que no es un id no se envía', async () => {
    const { deps, calls } = createDeps()
    expect(await performApprove({ requestId: 'x', approvedAmount: '100' }, deps)).toEqual({ ok: false, message: decisionMessages.invalidInput })
    expect(calls).toEqual([])
  })

  it.each([
    [reviewRefused('request-not-pending'), reviewRefusalMessages['request-not-pending']],
    [delinquencyStorageFailed('caída'), decisionMessages.saveFailed],
  ])('cada rechazo llega con su mensaje', async (error, message) => {
    const { deps } = createDeps({ approve: async () => err(error) })
    expect(await performApprove({ requestId: REQUEST_ID, approvedAmount: '100' }, deps)).toEqual({ ok: false, message })
  })
})

describe('performReject', () => {
  it('rechaza con el motivo', async () => {
    const { deps, calls } = createDeps()
    const result = await performReject({ requestId: REQUEST_ID, reason: 'No se lee' }, deps)

    expect(result).toEqual({ ok: true, message: decisionMessages.rejected })
    expect(calls).toEqual([['reject', { requestId: REQUEST_ID, reason: 'No se lee' }]])
  })

  it('sin motivo no se envía', async () => {
    const { deps, calls } = createDeps()
    expect(await performReject({ requestId: REQUEST_ID, reason: null }, deps)).toEqual({
      ok: false,
      message: reviewRefusalMessages['rejection-reason-required'],
    })
    expect(calls).toEqual([])
  })

  it('un motivo vacío que rechaza el caso de uso llega con su mensaje', async () => {
    const { deps } = createDeps({ reject: async () => err(reviewRefused('rejection-reason-required')) })
    expect(await performReject({ requestId: REQUEST_ID, reason: '  ' }, deps)).toEqual({
      ok: false,
      message: reviewRefusalMessages['rejection-reason-required'],
    })
  })
})
