import { describe, it, expect } from 'vitest'
import { toProductDetail, type PublicProductDetailSource } from '@/features/store/domain/product-detail'

const SERUM_ID = '2d4f6a8c-1b3e-4d5f-8a7c-9e0b1c2d3e4f'

const source = (overrides: Partial<PublicProductDetailSource> = {}): PublicProductDetailSource => ({
  id: SERUM_ID,
  slug: 'serum-nutritivo-lashary',
  name: 'Serum nutritivo Lashary',
  description: 'Tratamiento nutritivo para pestañas.',
  imageUrl: '/productos/serum-nutritivo.jpg',
  priceCrc: 18000,
  stock: 3,
  isActive: true,
  ...overrides,
})

describe('toProductDetail', () => {
  it('arma el detalle con imagen, nombre, descripción y precio en colones', () => {
    const detail = toProductDetail(source())
    expect(detail.slug).toBe('serum-nutritivo-lashary')
    expect(detail.name).toBe('Serum nutritivo Lashary')
    expect(detail.description).toBe('Tratamiento nutritivo para pestañas.')
    expect(detail.imageUrl).toBe('/productos/serum-nutritivo.jpg')
    expect(detail.priceLabel).toMatch(/18.000/)
  })

  it('marca el producto como disponible si quedan existencias', () => {
    expect(toProductDetail(source({ stock: 1 })).isAvailable).toBe(true)
  })

  it('marca el producto como agotado si no quedan existencias', () => {
    expect(toProductDetail(source({ stock: 0 })).isAvailable).toBe(false)
  })

  it('no expone el número de existencias a la tienda pública', () => {
    expect(toProductDetail(source({ stock: 7 }))).not.toHaveProperty('stock')
  })

  it('descarta una URL de imagen con esquema peligroso', () => {
    expect(toProductDetail(source({ imageUrl: 'javascript:alert(1)' })).imageUrl).toBe('')
  })
})
