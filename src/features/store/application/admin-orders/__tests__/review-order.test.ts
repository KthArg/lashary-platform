import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { createOrderNotPending } from '../../../domain/order-errors'
import { approveOrder, loadOrderHistoryPage, loadPendingOrders, rejectOrder } from '../review-order'
import type { OrderQueueItem, OrderReviewRepository } from '../ports'

function createRepo(overrides: Partial<OrderReviewRepository> = {}) {
  const calls: { approved: string[]; rejected: Array<{ orderId: string; reason: string }> } = {
    approved: [],
    rejected: [],
  }
  const repo: OrderReviewRepository = {
    async listPending() {
      return ok([])
    },
    async listHistory(page, pageSize) {
      return ok({ items: [], page, pageSize, total: 0 })
    },
    async approve(orderId) {
      calls.approved.push(orderId)
      return ok(undefined)
    },
    async reject(orderId, reason) {
      calls.rejected.push({ orderId, reason })
      return ok(undefined)
    },
    ...overrides,
  }
  return { repo, calls }
}

const ITEM: OrderQueueItem = {
  id: 'order-1',
  clientId: 'client-1',
  clientName: 'Clienta A',
  contactPhone: '88887012',
  deliveryMethod: 'pickup',
  deliveryAddress: null,
  totalColones: 4000,
  receiptPath: 'client-1/r1.jpg',
  createdAt: new Date('2026-11-23T10:00:00Z'),
  lines: [],
}

describe('loadPendingOrders', () => {
  it('devuelve los pedidos pendientes del repositorio', async () => {
    const { repo } = createRepo({ listPending: async () => ok([ITEM]) })
    const result = await loadPendingOrders(repo)(50)
    expect(isOk(result) && result.value).toEqual([ITEM])
  })
})

describe('loadOrderHistoryPage', () => {
  it('devuelve la página del historial que entrega el repositorio', async () => {
    const page = { items: [{ ...ITEM, state: 'approved' as const, rejectionReason: null, reviewedAt: new Date() }], page: 0, pageSize: 20, total: 1 }
    const { repo } = createRepo({ listHistory: async () => ok(page) })
    const result = await loadOrderHistoryPage(repo)(0, 20)
    expect(isOk(result) && result.value).toEqual(page)
  })
})

describe('approveOrder', () => {
  it('aprueba el pedido indicado', async () => {
    const { repo, calls } = createRepo()
    const result = await approveOrder(repo)('order-1')
    expect(isOk(result)).toBe(true)
    expect(calls.approved).toEqual(['order-1'])
  })

  it('propaga el rechazo del repositorio', async () => {
    const { repo } = createRepo({ approve: async () => err(createOrderNotPending()) })
    const result = await approveOrder(repo)('order-1')
    expect(isErr(result) && result.error.code).toBe('STORE_PEDIDO_NO_PENDIENTE')
  })
})

describe('rejectOrder', () => {
  it('rechaza un motivo demasiado corto antes de llamar al repositorio', async () => {
    const { repo, calls } = createRepo()
    const result = await rejectOrder(repo)('order-1', 'corto')
    expect(isErr(result) && result.error.code).toBe('STORE_PEDIDO_MOTIVO_RECHAZO_INVALIDO')
    expect(calls.rejected).toEqual([])
  })

  it('recorta el motivo y rechaza el pedido', async () => {
    const { repo, calls } = createRepo()
    const result = await rejectOrder(repo)('order-1', '  El comprobante no corresponde  ')
    expect(isOk(result)).toBe(true)
    expect(calls.rejected).toEqual([{ orderId: 'order-1', reason: 'El comprobante no corresponde' }])
  })
})
