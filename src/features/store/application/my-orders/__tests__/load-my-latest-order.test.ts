import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { createStoreStorageFailed } from '../../../domain/order-errors'
import { loadMyLatestOrder } from '../load-my-latest-order'
import type { MyLatestOrder, MyOrdersRepository } from '../ports'

const ORDER: MyLatestOrder = {
  id: 'order-1',
  state: 'approved',
  totalColones: 4000,
  rejectionReason: null,
  createdAt: new Date('2026-11-24T10:00:00Z'),
}

function createRepo(overrides: Partial<MyOrdersRepository> = {}): MyOrdersRepository {
  return {
    async loadMostRecent() {
      return ok(null)
    },
    ...overrides,
  }
}

describe('loadMyLatestOrder', () => {
  it('devuelve el pedido más reciente del repositorio, sin importar su estado', async () => {
    const repo = createRepo({ loadMostRecent: async () => ok(ORDER) })
    const result = await loadMyLatestOrder(repo)()
    expect(result).toEqual({ ok: true, value: ORDER })
  })

  it('sin pedidos, devuelve null', async () => {
    const repo = createRepo()
    const result = await loadMyLatestOrder(repo)()
    expect(result).toEqual({ ok: true, value: null })
  })

  it('propaga el error del repositorio', async () => {
    const repo = createRepo({ loadMostRecent: async () => err(createStoreStorageFailed('caída')) })
    const result = await loadMyLatestOrder(repo)()
    expect(result).toEqual({ ok: false, error: createStoreStorageFailed('caída') })
  })
})
