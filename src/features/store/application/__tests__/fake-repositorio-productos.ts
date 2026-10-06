import type { ProductoAdminVista } from '@/features/store/domain/producto'
import { crearProductoSlugDuplicado } from '@/features/store/domain/errores-producto'
import type { ProductoRepositorioAdmin } from '@/features/store/application/productos-admin-puertos'

export type FakeProductoRepositorioAdmin = ProductoRepositorioAdmin & { saveCalls: number }

export function crearFakeProductoRepositorioAdmin(
  initial: ProductoAdminVista[] = [],
): FakeProductoRepositorioAdmin {
  const store = new Map<string, ProductoAdminVista>()
  for (const p of initial) store.set(p.id, p)

  const repo: FakeProductoRepositorioAdmin = {
    saveCalls: 0,

    async list(params: { activeOnly: boolean; offset: number; limit: number }) {
      let all = [...store.values()]
      if (params.activeOnly) all = all.filter((p) => p.activo)
      all.sort((a, b) => a.ordenPresentacion - b.ordenPresentacion)
      return {
        items: all.slice(params.offset, params.offset + params.limit),
        total: all.length,
      }
    },

    async findById(id: string) {
      return store.get(id) ?? null
    },

    async save(producto: ProductoAdminVista) {
      for (const other of store.values()) {
        if (other.id !== producto.id && other.slug === producto.slug) {
          throw crearProductoSlugDuplicado(producto.slug)
        }
      }
      repo.saveCalls += 1
      store.set(producto.id, producto)
    },
  }

  return repo
}
