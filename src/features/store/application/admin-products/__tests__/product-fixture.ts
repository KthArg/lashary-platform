import { isOk } from '@/shared/result'
import { construirProducto, type ProductoAdminVista } from '@/features/store/domain/product'

let counter = 0

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
  counter += 1
  const result = construirProducto({
    id: overrides.id ?? `p-${counter}`,
    slug: overrides.slug ?? `producto-${counter}`,
    nombre: overrides.nombre ?? `Producto ${counter}`,
    descripcion: 'Descripción de prueba.',
    urlImagen: '/productos/prueba.jpg',
    precioCrc: overrides.precioCrc ?? 18000,
    ordenPresentacion: overrides.ordenPresentacion ?? 0,
    activo: overrides.activo ?? true,
  })
  if (!isOk(result)) {
    throw new Error(`fixture inválida: ${result.error.message}`)
  }
  return result.value
}
