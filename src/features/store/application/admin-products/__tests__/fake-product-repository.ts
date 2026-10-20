import type { AdminProduct } from '@/features/store/domain/product'
import { createDuplicateProductSlug } from '@/features/store/domain/product-errors'
import type { AdminProductRepository } from '@/features/store/application/admin-products/ports'

export type FakeAdminProductRepository = AdminProductRepository & { saveCalls: number }

export function createFakeAdminProductRepository(
  initial: AdminProduct[] = [],
): FakeAdminProductRepository {
  const store = new Map<string, AdminProduct>()
  for (const product of initial) store.set(product.id, product)

  const repo: FakeAdminProductRepository = {
    saveCalls: 0,

    async list(params: { activeOnly: boolean; offset: number; limit: number }) {
      let all = [...store.values()]
      if (params.activeOnly) all = all.filter((product) => product.isActive)
      all.sort((first, second) => first.displayOrder - second.displayOrder)
      return {
        items: all.slice(params.offset, params.offset + params.limit),
        total: all.length,
      }
    },

    async findById(id: string) {
      return store.get(id) ?? null
    },

    async listSlugsStartingWith(prefix: string) {
      return [...store.values()]
        .map((product) => product.slug)
        .filter((slug) => slug.startsWith(prefix))
    },

    async save(product: AdminProduct) {
      for (const other of store.values()) {
        if (other.id !== product.id && other.slug === product.slug) {
          throw createDuplicateProductSlug(product.slug)
        }
      }
      repo.saveCalls += 1
      store.set(product.id, product)
    },
  }

  return repo
}
