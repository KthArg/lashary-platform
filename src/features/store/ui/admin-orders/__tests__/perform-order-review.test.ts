import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import {
  createInvalidRejectionReason,
  createOrderNotFound,
  createOrderNotPending,
  createStoreStorageFailed,
} from '@/features/store/domain/order-errors'
import { orderDecisionMessages, orderReviewRefusalMessages } from '../constants/order-queue-strings'
import { performApproveOrder, performRejectOrder, type OrderReviewDeps } from '../utils/perform-order-review'

const ORDER_ID = '00000000-0000-4000-8000-000000000e01'

function createDeps(overrides: Partial<OrderReviewDeps> = {}) {
  const calls: unknown[] = []
  const deps: OrderReviewDeps = {
    approve: async (orderId) => (calls.push(['approve', orderId]), ok(undefined)),
    reject: async (orderId, reason) => (calls.push(['reject', orderId, reason]), ok(undefined)),
    ...overrides,
  }
  return { deps, calls }
}

describe('performApproveOrder', () => {
  it('aprueba el pedido indicado', async () => {
    const { deps, calls } = createDeps()
    const result = await performApproveOrder({ orderId: ORDER_ID }, deps)

    expect(result).toEqual({ ok: true, message: orderDecisionMessages.approved })
    expect(calls).toEqual([['approve', ORDER_ID]])
  })

  it('un pedido que no es un id no se aprueba', async () => {
    const { deps, calls } = createDeps()
    expect(await performApproveOrder({ orderId: 'x' }, deps)).toEqual({ ok: false, message: orderDecisionMessages.invalidInput })
    expect(calls).toEqual([])
  })

  it.each([
    [createOrderNotPending(), orderReviewRefusalMessages['order-not-pending']],
    [createOrderNotFound(), orderReviewRefusalMessages['order-not-found']],
    [createStoreStorageFailed('caída'), orderDecisionMessages.saveFailed],
  ])('cada rechazo llega con su mensaje', async (error, message) => {
    const { deps } = createDeps({ approve: async () => err(error) })
    expect(await performApproveOrder({ orderId: ORDER_ID }, deps)).toEqual({ ok: false, message })
  })
})

describe('performRejectOrder', () => {
  it('rechaza con el motivo', async () => {
    const { deps, calls } = createDeps()
    const result = await performRejectOrder({ orderId: ORDER_ID, reason: 'El comprobante no corresponde' }, deps)

    expect(result).toEqual({ ok: true, message: orderDecisionMessages.rejected })
    expect(calls).toEqual([['reject', ORDER_ID, 'El comprobante no corresponde']])
  })

  it('sin motivo no se envía', async () => {
    const { deps, calls } = createDeps()
    expect(await performRejectOrder({ orderId: ORDER_ID, reason: null }, deps)).toEqual({
      ok: false,
      message: orderReviewRefusalMessages['rejection-reason-required'],
    })
    expect(calls).toEqual([])
  })

  it('un motivo corto que rechaza el caso de uso llega con su mensaje', async () => {
    const { deps } = createDeps({ reject: async () => err(createInvalidRejectionReason()) })
    expect(await performRejectOrder({ orderId: ORDER_ID, reason: 'corto' }, deps)).toEqual({
      ok: false,
      message: orderReviewRefusalMessages['rejection-reason-required'],
    })
  })
})
