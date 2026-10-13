import { Money } from '@/shared/money'
import { isOk } from '@/shared/result'
import { buildCartLine, type CartLine, type CartProduct } from '@/features/store/domain/cart'
import type { CartRepository } from '@/features/store/application/cart/ports'

export type FakeCartProduct = CartProduct & { isActive: boolean }

export type FakeCartRepository = CartRepository & { saveCalls: number }

export function makeCartProduct(overrides: Partial<FakeCartProduct> = {}): FakeCartProduct {
  return {
    id: 'producto-serum',
    slug: 'serum-nutritivo-lashary',
    name: 'Serum nutritivo Lashary',
    imageUrl: '/productos/serum-nutritivo.jpg',
    unitPrice: Money.fromColones(18000),
    isActive: true,
    ...overrides,
  }
}

function lineKey(userId: string, productId: string): string {
  return `${userId}:${productId}`
}

export function createFakeCartRepository(products: FakeCartProduct[]): FakeCartRepository {
  const productsById = new Map(products.map((product) => [product.id, product]))
  const quantities = new Map<string, { userId: string; productId: string; quantity: number }>()

  const repo: FakeCartRepository = {
    saveCalls: 0,

    async listLines(userId: string): Promise<CartLine[]> {
      return [...quantities.values()]
        .filter((entry) => entry.userId === userId)
        .flatMap((entry) => {
          const product = productsById.get(entry.productId)
          if (!product?.isActive) return []
          const line = buildCartLine(product, entry.quantity)
          return isOk(line) ? [line.value] : []
        })
    },

    async findQuantity(userId: string, productId: string) {
      return quantities.get(lineKey(userId, productId))?.quantity ?? null
    },

    async saveQuantity(userId: string, productId: string, quantity: number) {
      repo.saveCalls += 1
      quantities.set(lineKey(userId, productId), { userId, productId, quantity })
    },

    async remove(userId: string, productId: string) {
      quantities.delete(lineKey(userId, productId))
    },

    async isProductActive(productId: string) {
      return productsById.get(productId)?.isActive ?? false
    },
  }

  return repo
}
