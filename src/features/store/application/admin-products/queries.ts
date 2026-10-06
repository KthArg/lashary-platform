import { ok, err, type Result } from '@/shared/result'
import type { ProductoAdminVista } from '../../domain/product'
import { crearProductoNoEncontrado, type ProductoNoEncontrado } from '../../domain/product-errors'
import type {
  ListaProductosAdminQuery,
  PaginaProductos,
  ProductoRepositorioAdmin,
} from './ports'

const TAMANO_PAGINA_DEFECTO = 50
const TAMANO_PAGINA_MAX = 100

const acotarPagina = (value: number | undefined): number =>
  Math.max(1, Math.trunc(value ?? 1) || 1)

const acotarTamanoPagina = (value: number | undefined): number =>
  Math.min(
    TAMANO_PAGINA_MAX,
    Math.max(1, Math.trunc(value ?? TAMANO_PAGINA_DEFECTO) || TAMANO_PAGINA_DEFECTO),
  )

export const listarProductosAdmin =
  (repo: ProductoRepositorioAdmin) =>
  async (query: ListaProductosAdminQuery = {}): Promise<PaginaProductos<ProductoAdminVista>> => {
    const page = acotarPagina(query.page)
    const pageSize = acotarTamanoPagina(query.pageSize)
    const activeOnly = query.activeOnly ?? true

    const { items, total } = await repo.list({
      activeOnly,
      offset: (page - 1) * pageSize,
      limit: pageSize,
    })

    return {
      items,
      page,
      pageSize,
      total,
    }
  }

export const obtenerProductoAdmin =
  (repo: ProductoRepositorioAdmin) =>
  async (id: string): Promise<Result<ProductoAdminVista, ProductoNoEncontrado>> => {
    const producto = await repo.findById(id)
    if (producto === null) return err(crearProductoNoEncontrado(id))
    return ok(producto)
  }
