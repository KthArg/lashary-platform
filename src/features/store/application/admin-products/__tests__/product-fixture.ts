import { isOk } from '@/shared/result'
import { buildProduct, type AdminProduct } from '@/features/store/domain/product'

let counter = 0

export function makeProduct(
  overrides: Partial<{
    id: string
    slug: string
    name: string
    priceCrc: number
    displayOrder: number
    stock: number
    isActive: boolean
  }> = {},
): AdminProduct {
  counter += 1
  const result = buildProduct({
    id: overrides.id ?? `p-${counter}`,
    slug: overrides.slug ?? `producto-${counter}`,
    name: overrides.name ?? `Producto ${counter}`,
    description: 'Descripción de prueba.',
    imageUrl: '/productos/prueba.jpg',
    priceCrc: overrides.priceCrc ?? 18000,
    displayOrder: overrides.displayOrder ?? 0,
    stock: overrides.stock ?? 10,
    isActive: overrides.isActive ?? true,
  })
  if (!isOk(result)) {
    throw new Error(`fixture inválida: ${result.error.message}`)
  }
  return result.value
}
