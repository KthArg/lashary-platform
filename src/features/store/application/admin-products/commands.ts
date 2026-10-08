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
  producto: AdminProduct,
): Promise<Result<void, DuplicateProductSlug>> {
  try {
    await repo.save(producto)
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
  activo: boolean,
): Result<AdminProduct, InvalidProduct> {
  return buildProduct({
    id,
    slug: model.slug,
    nombre: model.nombre,
    descripcion: model.descripcion,
    urlImagen: model.urlImagen,
    precioCrc: model.precioCrc,
    ordenPresentacion: model.ordenPresentacion,
    activo,
  })
}

export const createProduct =
  (deps: ProductCommandDeps) =>
  async (
    model: ProductWrite,
  ): Promise<Result<AdminProduct, InvalidProduct | DuplicateProductSlug>> => {
    const construido = buildFromWrite(deps.newId(), model, true)
    if (isErr(construido)) return construido
    const guardado = await saveOrConflict(deps.repo, construido.value)
    if (isErr(guardado)) return guardado
    return ok(construido.value)
  }

export const updateProduct =
  (deps: ProductCommandDeps) =>
  async (
    id: string,
    model: ProductWrite,
  ): Promise<
    Result<AdminProduct, ProductNotFound | InvalidProduct | DuplicateProductSlug>
  > => {
    const existente = await deps.repo.findById(id)
    if (existente === null) return err(createProductNotFound(id))

    const construido = buildFromWrite(id, model, existente.activo)
    if (isErr(construido)) return construido
    const guardado = await saveOrConflict(deps.repo, construido.value)
    if (isErr(guardado)) return guardado
    return ok(construido.value)
  }

export const deactivateProduct =
  (deps: ProductCommandDeps) =>
  async (id: string): Promise<Result<AdminProduct, ProductNotFound>> => {
    const existente = await deps.repo.findById(id)
    if (existente === null) return err(createProductNotFound(id))

    const desactivado = markProductInactive(existente)
    await deps.repo.save(desactivado)
    return ok(desactivado)
  }
