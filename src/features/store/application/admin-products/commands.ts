import { ok, err, isErr, type Result } from '@/shared/result'
import {
  buildProduct,
  markProductActive,
  markProductInactive,
  type AdminProduct,
} from '../../domain/product'
import { firstAvailableSlug, slugFromName } from '../../domain/product-slug'
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
  slug: string,
  model: ProductWrite,
  isActive: boolean,
): Result<AdminProduct, InvalidProduct> {
  return buildProduct({
    id,
    slug,
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
    const draft = buildFromWrite(deps.newId(), slugFromName(model.name), model, true)
    if (isErr(draft)) return draft
    const takenSlugs = await deps.repo.listSlugsStartingWith(draft.value.slug)
    const product = { ...draft.value, slug: firstAvailableSlug(draft.value.slug, takenSlugs) }
    const saved = await saveOrConflict(deps.repo, product)
    if (isErr(saved)) return saved
    return ok(product)
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

    const built = buildFromWrite(id, existing.slug, model, existing.isActive)
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

export const activateProduct =
  (deps: ProductCommandDeps) =>
  async (id: string): Promise<Result<AdminProduct, ProductNotFound>> => {
    const existing = await deps.repo.findById(id)
    if (existing === null) return err(createProductNotFound(id))

    const activated = markProductActive(existing)
    await deps.repo.save(activated)
    return ok(activated)
  }
