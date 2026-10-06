import { isOk } from '@/shared/result'
import {
  listAdminProducts,
  getAdminProduct,
} from '../../../../application/admin-products/queries'
import { adminProductRepository } from '../../../../db/admin-product-repository'
import type { AdminProduct } from '../../../../domain/product'
import { aFilasProductoAdmin } from '../ProductsAdminTable/ProductsAdminTable.data'
import type { FilaProductoAdmin } from '../ProductsAdminTable/ProductsAdminTable.types'
import type { PanelAdminProductosSearchParams } from './ProductsAdminPanel.types'

export type VistaPanelAdminProductos =
  | { modo: 'formulario'; productoEnEdicion?: AdminProduct }
  | { modo: 'vacio' }
  | { modo: 'listado'; filas: FilaProductoAdmin[] }

export async function obtenerVistaPanelAdminProductos(
  searchParams?: Promise<PanelAdminProductosSearchParams>,
): Promise<VistaPanelAdminProductos> {
  const params = (await searchParams) ?? {}
  const repo = await adminProductRepository()

  const page = await listAdminProducts(repo)({ activeOnly: false, pageSize: 100 })

  const editResult = params.edit ? await getAdminProduct(repo)(params.edit) : null
  const productoEnEdicion = editResult && isOk(editResult) ? editResult.value : undefined
  const mostrarFormulario = params.new !== undefined || productoEnEdicion !== undefined

  if (mostrarFormulario) return { modo: 'formulario', productoEnEdicion }

  const filas = aFilasProductoAdmin(page.items)
  if (filas.length === 0) return { modo: 'vacio' }
  return { modo: 'listado', filas }
}
