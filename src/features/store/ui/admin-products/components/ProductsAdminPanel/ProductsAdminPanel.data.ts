import { isOk } from '@/shared/result'
import {
  listAdminProducts,
  getAdminProduct,
} from '../../../../application/admin-products/queries'
import { adminProductRepository } from '../../../../db/admin-product-repository'
import type { AdminProduct } from '../../../../domain/product'
import { toAdminProductRows } from '../ProductsAdminTable/ProductsAdminTable.data'
import type { AdminProductRow } from '../ProductsAdminTable/ProductsAdminTable.types'
import type { ProductsAdminPanelSearchParams } from './ProductsAdminPanel.types'

export type ProductsAdminPanelView =
  | { mode: 'form'; editingProduct?: AdminProduct }
  | { mode: 'empty' }
  | { mode: 'list'; rows: AdminProductRow[] }

export async function getProductsAdminPanelView(
  searchParams?: Promise<ProductsAdminPanelSearchParams>,
): Promise<ProductsAdminPanelView> {
  const params = (await searchParams) ?? {}
  const repo = await adminProductRepository()

  const page = await listAdminProducts(repo)({ activeOnly: false, pageSize: 100 })

  const editResult = params.edit ? await getAdminProduct(repo)(params.edit) : null
  const editingProduct = editResult && isOk(editResult) ? editResult.value : undefined
  const showForm = params.new !== undefined || editingProduct !== undefined

  if (showForm) return { mode: 'form', editingProduct }

  const rows = toAdminProductRows(page.items)
  if (rows.length === 0) return { mode: 'empty' }
  return { mode: 'list', rows }
}
