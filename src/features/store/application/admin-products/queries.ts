import { ok, err, type Result } from '@/shared/result'
import type { AdminProduct } from '../../domain/product'
import { createProductNotFound, type ProductNotFound } from '../../domain/product-errors'
import type {
  AdminProductListQuery,
  ProductPage,
  AdminProductRepository,
} from './ports'

export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100

const clampPage = (value: number | undefined): number =>
  Math.max(1, Math.trunc(value ?? 1) || 1)

const clampPageSize = (value: number | undefined): number =>
  Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.trunc(value ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE),
  )

export const listAdminProducts =
  (repo: AdminProductRepository) =>
  async (query: AdminProductListQuery = {}): Promise<ProductPage<AdminProduct>> => {
    const page = clampPage(query.page)
    const pageSize = clampPageSize(query.pageSize)
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

export const getAdminProduct =
  (repo: AdminProductRepository) =>
  async (id: string): Promise<Result<AdminProduct, ProductNotFound>> => {
    const product = await repo.findById(id)
    if (product === null) return err(createProductNotFound(id))
    return ok(product)
  }
