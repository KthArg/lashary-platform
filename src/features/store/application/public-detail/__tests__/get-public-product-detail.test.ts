import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  getPublicProductDetail,
  type PublicProductDetailReader,
} from '@/features/store/application/public-detail/get-public-product-detail'
import type { PublicProductDetailSource } from '@/features/store/domain/product-detail'

const serum: PublicProductDetailSource = {
  slug: 'serum-nutritivo-lashary',
  name: 'Serum nutritivo Lashary',
  description: 'Tratamiento nutritivo para pestañas.',
  imageUrl: '/productos/serum-nutritivo.jpg',
  priceCrc: 18000,
  stock: 4,
  isActive: true,
}

function readerWith(products: PublicProductDetailSource[]): PublicProductDetailReader {
  return {
    async findBySlug(slug: string) {
      return products.find((product) => product.slug === slug) ?? null
    },
  }
}

describe('getPublicProductDetail (US-PROD-03)', () => {
  it('devuelve el detalle de un producto activo con existencias', async () => {
    const result = await getPublicProductDetail(readerWith([serum]))('serum-nutritivo-lashary')
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.name).toBe('Serum nutritivo Lashary')
    expect(result.value.isAvailable).toBe(true)
  })

  it('criterio 3: un producto activo sin existencias se devuelve como agotado, no como inexistente', async () => {
    const agotado = { ...serum, stock: 0 }
    const result = await getPublicProductDetail(readerWith([agotado]))('serum-nutritivo-lashary')
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.isAvailable).toBe(false)
  })

  it('DOM-006: un slug inexistente devuelve PublicProductNotFound, no una excepción', async () => {
    const result = await getPublicProductDetail(readerWith([serum]))('no-existe')
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error.kind).toBe('PublicProductNotFound')
    expect(result.error.slug).toBe('no-existe')
  })

  it('un producto desactivado no se muestra en la tienda', async () => {
    const desactivado = { ...serum, isActive: false }
    const result = await getPublicProductDetail(readerWith([desactivado]))('serum-nutritivo-lashary')
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.kind).toBe('PublicProductNotFound')
  })
})
