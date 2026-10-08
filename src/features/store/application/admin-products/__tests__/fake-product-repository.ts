import type { AdminProduct } from '@/features/store/domain/product'
import { createDuplicateProductSlug } from '@/features/store/domain/product-errors'
import type { AdminProductRepository } from '@/features/store/application/admin-products/ports'

export type FakeAdminProductRepository = AdminProductRepository & { saveCalls: number }

export function createFakeAdminProductRepository(
  initial: AdminProduct[] = [],
): FakeAdminProductRepository {
  const store = new Map<string, AdminProduct>()
  for (const p of initial) store.set(p.id, p)

  const repo: FakeAdminProductRepository = {
    saveCalls: 0,

    async list(params: { activeOnly: boolean; offset: number; limit: number }) {
      let all = [...store.values()]
      if (params.activeOnly) all = all.filter((p) => p.activo)
      all.sort((a, b) => a.displayOrder - b.displayOrder)
      return {
        items: all.slice(params.offset, params.offset + params.limit),
        total: all.length,
      }
    },

    async findById(id: string) {
      return store.get(id) ?? null
    },

    async save(producto: AdminProduct) {
      for (const other of store.values()) {
        if (other.id !== producto.id && other.slug === producto.slug) {
          throw createDuplicateProductSlug(producto.slug)
        }
      }
      repo.saveCalls += 1
      store.set(producto.id, producto)
    },
  }

  return repo
}
