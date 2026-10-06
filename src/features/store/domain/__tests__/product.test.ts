import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  buildProduct,
  markProductInactive,
  toProductCard,
  sanitizeUrl,
} from '@/features/store/domain/product'

const validInput = () => ({
  id: '11111111-1111-1111-1111-111111111111',
  slug: 'serum-nutritivo-lashary',
  name: 'Serum nutritivo Lashary',
  description: 'Tratamiento nutritivo para mantenimiento de pestañas.',
  imageUrl: '/productos/serum-nutritivo.jpg',
  priceCrc: 18000,
  displayOrder: 1,
})

describe('buildProduct — invariantes de dominio (DOM-007)', () => {
  it('crea un producto válido con todos los campos', () => {
    const result = buildProduct(validInput())
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.name).toBe('Serum nutritivo Lashary')
    expect(result.value.slug).toBe('serum-nutritivo-lashary')
    expect(result.value.priceCrc).toBe(18000)
    expect(result.value.isActive).toBe(true)
  })

  it('recorta espacios de slug, nombre, descripción e imageUrl', () => {
    const result = buildProduct({
      ...validInput(),
      slug: '  serum-nutritivo-lashary  ',
      name: '  Serum nutritivo Lashary  ',
      description: '  cuidados  ',
      imageUrl: '  /productos/serum-nutritivo.jpg  ',
    })
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.slug).toBe('serum-nutritivo-lashary')
    expect(result.value.name).toBe('Serum nutritivo Lashary')
    expect(result.value.description).toBe('cuidados')
    expect(result.value.imageUrl).toBe('/productos/serum-nutritivo.jpg')
  })

  it('acepta descripción vacía', () => {
    const result = buildProduct({ ...validInput(), description: '' })
    expect(isOk(result)).toBe(true)
  })

  it('rechaza slug vacío', () => {
    const result = buildProduct({ ...validInput(), slug: '   ' })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error.kind).toBe('InvalidProduct')
    expect(result.error.problems.join(' ')).toMatch(/slug/i)
  })

  it('rechaza nombre vacío', () => {
    const result = buildProduct({ ...validInput(), name: '   ' })
    expect(isErr(result)).toBe(true)
  })

  it('rechaza imageUrl vacía', () => {
    const result = buildProduct({ ...validInput(), imageUrl: '   ' })
    expect(isErr(result)).toBe(true)
  })

  it('rechaza precio no positivo', () => {
    expect(isErr(buildProduct({ ...validInput(), priceCrc: 0 }))).toBe(true)
    expect(isErr(buildProduct({ ...validInput(), priceCrc: -1 }))).toBe(true)
  })

  it('rechaza precio no entero', () => {
    expect(isErr(buildProduct({ ...validInput(), priceCrc: 18000.5 }))).toBe(true)
  })

  it('acepta orden de presentación cero, rechaza negativo', () => {
    expect(isOk(buildProduct({ ...validInput(), displayOrder: 0 }))).toBe(true)
    expect(isErr(buildProduct({ ...validInput(), displayOrder: -1 }))).toBe(true)
  })

  it('rechaza orden de presentación no entero', () => {
    expect(isErr(buildProduct({ ...validInput(), displayOrder: 1.5 }))).toBe(true)
  })

  it('acumula varios problemas en un solo error', () => {
    const result = buildProduct({
      ...validInput(),
      slug: '',
      name: '',
      displayOrder: -5,
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error.problems.length).toBeGreaterThanOrEqual(3)
  })
})

describe('markProductInactive', () => {
  it('devuelve una copia inactiva sin mutar la original', () => {
    const result = buildProduct(validInput())
    if (!isOk(result)) throw new Error('esperaba ok')
    const original = result.value
    const inactive = markProductInactive(original)
    expect(inactive.isActive).toBe(false)
    expect(original.isActive).toBe(true)
    expect(inactive.id).toBe(original.id)
  })
})

describe('sanitizeUrl', () => {
  it('deja pasar una URL relativa o http(s) normal', () => {
    expect(sanitizeUrl('/productos/serum.jpg')).toBe('/productos/serum.jpg')
    expect(sanitizeUrl('https://cdn.lashary.com/a.jpg')).toBe('https://cdn.lashary.com/a.jpg')
  })

  it('recorta espacios', () => {
    expect(sanitizeUrl('  /productos/serum.jpg  ')).toBe('/productos/serum.jpg')
  })

  it('bloquea esquema javascript: y data: (mayúsculas incluidas)', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('')
    expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('')
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('')
  })

  it('devuelve vacío para una URL vacía', () => {
    expect(sanitizeUrl('   ')).toBe('')
  })
})

describe('toProductCard', () => {
  it('sanitiza la URL de imagen de un ProductoPublico no confiable (CMS/DB)', () => {
    const card = toProductCard({
      id: '1',
      name: 'Producto',
      imageUrl: 'javascript:alert(1)',
      priceCrc: 18000,
      isActive: true,
    })
    expect(card.imageUrl).toBe('')
  })

  it('conserva una URL de imagen segura', () => {
    const card = toProductCard({
      id: '1',
      name: 'Producto',
      imageUrl: '/productos/serum.jpg',
      priceCrc: 18000,
      isActive: true,
    })
    expect(card.imageUrl).toBe('/productos/serum.jpg')
  })
})
