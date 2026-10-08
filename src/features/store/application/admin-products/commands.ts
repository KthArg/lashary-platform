import { ok, err, isErr, type Result } from '@/shared/result'
import { construirProducto, marcarProductoInactivo, type ProductoAdminVista } from '../../domain/product'
import {
  crearProductoNoEncontrado,
  esProductoSlugDuplicado,
  type ProductoInvalido,
  type ProductoNoEncontrado,
  type ProductoSlugDuplicado,
} from '../../domain/product-errors'
import type { ProductoEscritura, ProductoRepositorioAdmin } from './ports'

async function guardarOConflicto(
  repo: ProductoRepositorioAdmin,
  producto: ProductoAdminVista,
): Promise<Result<void, ProductoSlugDuplicado>> {
  try {
    await repo.save(producto)
    return ok(undefined)
  } catch (error) {
    if (esProductoSlugDuplicado(error)) return err(error)
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
): Result<ProductoAdminVista, ProductoInvalido> {
  return construirProducto({
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
  ): Promise<Result<ProductoAdminVista, ProductoInvalido | ProductoSlugDuplicado>> => {
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
    Result<ProductoAdminVista, ProductoNoEncontrado | ProductoInvalido | ProductoSlugDuplicado>
  > => {
    const existente = await deps.repo.findById(id)
    if (existente === null) return err(crearProductoNoEncontrado(id))

    const construido = construirDesdeEscritura(id, model, existente.activo)
    if (isErr(construido)) return construido
    const guardado = await guardarOConflicto(deps.repo, construido.value)
    if (isErr(guardado)) return guardado
    return ok(construido.value)
  }

export const desactivarProducto =
  (deps: ComandoProductoDeps) =>
  async (id: string): Promise<Result<ProductoAdminVista, ProductoNoEncontrado>> => {
    const existente = await deps.repo.findById(id)
    if (existente === null) return err(crearProductoNoEncontrado(id))

    const desactivado = marcarProductoInactivo(existente)
    await deps.repo.save(desactivado)
    return ok(desactivado)
  }
