import { randomUUID } from 'node:crypto'
import { isOk } from '@/shared/result'
import { construirProducto, type ProductoAdminVista } from '@/features/store/domain/producto'

export const PRECIO_FIXTURE_CRC = 18000
export const ORDEN_FIXTURE = 0

export function makeProducto(
  overrides: Partial<{
    id: string
    slug: string
    nombre: string
    precioCrc: number
    ordenPresentacion: number
    activo: boolean
  }> = {},
): ProductoAdminVista {
  const id = overrides.id ?? `p-${randomUUID()}`
  const result = construirProducto({
    id,
    slug: overrides.slug ?? `producto-${id}`,
    nombre: overrides.nombre ?? `Producto ${id}`,
    descripcion: 'Descripción de prueba.',
    urlImagen: '/productos/prueba.jpg',
    precioCrc: overrides.precioCrc ?? PRECIO_FIXTURE_CRC,
    ordenPresentacion: overrides.ordenPresentacion ?? ORDEN_FIXTURE,
    activo: overrides.activo ?? true,
  })
  if (!isOk(result)) {
    throw new Error(`fixture inválida: ${result.error.message}`)
  }
  return result.value
}
