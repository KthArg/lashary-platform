import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { createStoreStorageFailed } from '../../../domain/order-errors'
import { loadOrderQueue } from '../load-order-queue'
import type { OrderQueueItem, OrderReviewRepository, ReceiptLinks } from '../ports'

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

function createDeps(overrides: { requests?: Partial<OrderReviewRepository>; receipts?: Partial<ReceiptLinks> } = {}) {
  const requests: OrderReviewRepository = {
    listPending: async () => ok([ITEM]),
    approve: async () => ok(undefined),
    reject: async () => ok(undefined),
    ...overrides.requests,
  }
  const receipts: ReceiptLinks = {
    signedUrls: async (paths) => ok(new Map(paths.map((path) => [path, `https://signed/${path}`]))),
    ...overrides.receipts,
  }
  return { requests, receipts }
}

describe('loadOrderQueue', () => {
  it('agrega la URL firmada del comprobante de cada pedido', async () => {
    const { requests, receipts } = createDeps()
    const result = await loadOrderQueue({ requests, receipts })(50)

    expect(result).toEqual({ ok: true, value: [{ ...ITEM, receiptUrl: 'https://signed/client-1/r1.jpg' }] })
  })

  it('sin pedidos pendientes, no pide URLs firmadas', async () => {
    let asked = 0
    const { requests, receipts } = createDeps({
      requests: { listPending: async () => ok([]) },
      receipts: { signedUrls: async () => (asked += 1, ok(new Map())) },
    })
    const result = await loadOrderQueue({ requests, receipts })(50)

    expect(result).toEqual({ ok: true, value: [] })
    expect(asked).toBe(0)
  })

  it('si falla leer la cola, propaga el error', async () => {
    const { requests, receipts } = createDeps({ requests: { listPending: async () => err(createStoreStorageFailed('caída')) } })
    const result = await loadOrderQueue({ requests, receipts })(50)

    expect(result).toEqual({ ok: false, error: createStoreStorageFailed('caída') })
  })

  it('si fallan las URLs firmadas, el pedido se ve sin comprobante en vez de fallar todo', async () => {
    const { requests, receipts } = createDeps({ receipts: { signedUrls: async () => err(createStoreStorageFailed('caída')) } })
    const result = await loadOrderQueue({ requests, receipts })(50)

    expect(result).toEqual({ ok: true, value: [{ ...ITEM, receiptUrl: null }] })
  })
})
