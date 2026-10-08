import { ok, err, isErr, type Result } from '@/shared/result'
import { buildProduct, markProductInactive, type AdminProduct } from '../../domain/product'
import {
  createProductNotFound,
  isDuplicateProductSlug,
  type InvalidProduct,
  type ProductNotFound,
  type DuplicateProductSlug,
} from '../../domain/product-errors'
import type { ProductoEscritura, ProductoRepositorioAdmin } from './ports'

async function guardarOConflicto(
  repo: ProductoRepositorioAdmin,
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

export type ComandoProductoDeps = {
  repo: ProductoRepositorioAdmin
  newId: () => string
}

function construirDesdeEscritura(
  id: string,
  model: ProductoEscritura,
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

export const crearProducto =
  (deps: ComandoProductoDeps) =>
  async (
    model: ProductoEscritura,
  ): Promise<Result<AdminProduct, InvalidProduct | DuplicateProductSlug>> => {
    const construido = construirDesdeEscritura(deps.newId(), model, true)
    if (isErr(construido)) return construido
    const guardado = await guardarOConflicto(deps.repo, construido.value)
    if (isErr(guardado)) return guardado
    return ok(construido.value)
  }

export const actualizarProducto =
  (deps: ComandoProductoDeps) =>
  async (
    id: string,
    model: ProductoEscritura,
  ): Promise<
    Result<AdminProduct, ProductNotFound | InvalidProduct | DuplicateProductSlug>
  > => {
    const existente = await deps.repo.findById(id)
    if (existente === null) return err(createProductNotFound(id))

    const construido = construirDesdeEscritura(id, model, existente.activo)
    if (isErr(construido)) return construido
    const guardado = await guardarOConflicto(deps.repo, construido.value)
    if (isErr(guardado)) return guardado
    return ok(construido.value)
  }

export const desactivarProducto =
  (deps: ComandoProductoDeps) =>
  async (id: string): Promise<Result<AdminProduct, ProductNotFound>> => {
    const existente = await deps.repo.findById(id)
    if (existente === null) return err(createProductNotFound(id))

    const desactivado = markProductInactive(existente)
    await deps.repo.save(desactivado)
    return ok(desactivado)
  }
