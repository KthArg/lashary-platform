import { isOk } from '@/shared/result'
import { buildProduct, type AdminProduct } from '@/features/store/domain/product'

let counter = 0

export function makeProduct(
  overrides: Partial<{
    id: string
    slug: string
    nombre: string
    precioCrc: number
    ordenPresentacion: number
    activo: boolean
  }> = {},
): AdminProduct {
  counter += 1
  const result = buildProduct({
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
