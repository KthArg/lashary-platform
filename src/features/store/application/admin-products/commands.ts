import { ok, err, isErr, type Result } from '@/shared/result'
import { buildProduct, markProductInactive, type AdminProduct } from '../../domain/product'
import {
  createProductNotFound,
  isDuplicateProductSlug,
  type InvalidProduct,
  type ProductNotFound,
  type DuplicateProductSlug,
} from '../../domain/product-errors'
import type { ProductWrite, AdminProductRepository } from './ports'

async function saveOrConflict(
  repo: AdminProductRepository,
  product: AdminProduct,
): Promise<Result<void, DuplicateProductSlug>> {
  try {
    await repo.save(product)
    return ok(undefined)
  } catch (error) {
    if (isDuplicateProductSlug(error)) return err(error)
    throw error
  }
}

export type ProductCommandDeps = {
  repo: AdminProductRepository
  newId: () => string
}

function buildFromWrite(
  id: string,
  model: ProductWrite,
  isActive: boolean,
): Result<AdminProduct, InvalidProduct> {
  return buildProduct({
    id,
    slug: model.slug,
    name: model.name,
    description: model.description,
    imageUrl: model.imageUrl,
    priceCrc: model.priceCrc,
    displayOrder: model.displayOrder,
    stock: model.stock,
    isActive,
  })
}

export const createProduct =
  (deps: ProductCommandDeps) =>
  async (
    model: ProductWrite,
  ): Promise<Result<AdminProduct, InvalidProduct | DuplicateProductSlug>> => {
    const built = buildFromWrite(deps.newId(), model, true)
    if (isErr(built)) return built
    const saved = await saveOrConflict(deps.repo, built.value)
    if (isErr(saved)) return saved
    return ok(built.value)
  }

export const updateProduct =
  (deps: ProductCommandDeps) =>
  async (
    id: string,
    model: ProductWrite,
  ): Promise<
    Result<AdminProduct, ProductNotFound | InvalidProduct | DuplicateProductSlug>
  > => {
    const existing = await deps.repo.findById(id)
    if (existing === null) return err(createProductNotFound(id))

    const built = buildFromWrite(id, model, existing.isActive)
    if (isErr(built)) return built
    const saved = await saveOrConflict(deps.repo, built.value)
    if (isErr(saved)) return saved
    return ok(built.value)
  }

export const deactivateProduct =
  (deps: ProductCommandDeps) =>
  async (id: string): Promise<Result<AdminProduct, ProductNotFound>> => {
    const existing = await deps.repo.findById(id)
    if (existing === null) return err(createProductNotFound(id))

    const deactivated = markProductInactive(existing)
    await deps.repo.save(deactivated)
    return ok(deactivated)
  }
