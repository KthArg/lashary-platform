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
  nombre: 'Serum nutritivo Lashary',
  descripcion: 'Tratamiento nutritivo para mantenimiento de pestañas.',
  urlImagen: '/productos/serum-nutritivo.jpg',
  precioCrc: 18000,
  ordenPresentacion: 1,
})

describe('buildProduct — invariantes de dominio (DOM-007)', () => {
  it('crea un producto válido con todos los campos', () => {
    const r = buildProduct(validInput())
    expect(isOk(r)).toBe(true)
    if (!isOk(r)) return
    expect(r.value.nombre).toBe('Serum nutritivo Lashary')
    expect(r.value.slug).toBe('serum-nutritivo-lashary')
    expect(r.value.precioCrc).toBe(18000)
    expect(r.value.activo).toBe(true)
  })

  it('recorta espacios de slug, nombre, descripción y urlImagen', () => {
    const r = buildProduct({
      ...validInput(),
      slug: '  serum-nutritivo-lashary  ',
      nombre: '  Serum nutritivo Lashary  ',
      descripcion: '  cuidados  ',
      urlImagen: '  /productos/serum-nutritivo.jpg  ',
    })
    if (!isOk(r)) throw new Error('esperaba ok')
    expect(r.value.slug).toBe('serum-nutritivo-lashary')
    expect(r.value.nombre).toBe('Serum nutritivo Lashary')
    expect(r.value.descripcion).toBe('cuidados')
    expect(r.value.urlImagen).toBe('/productos/serum-nutritivo.jpg')
  })

  it('acepta descripción vacía', () => {
    const r = buildProduct({ ...validInput(), descripcion: '' })
    expect(isOk(r)).toBe(true)
  })

  it('rechaza slug vacío', () => {
    const r = buildProduct({ ...validInput(), slug: '   ' })
    expect(isErr(r)).toBe(true)
    if (!isErr(r)) return
    expect(r.error.tipo).toBe('InvalidProduct')
    expect(r.error.problems.join(' ')).toMatch(/slug/i)
  })

  it('rechaza nombre vacío', () => {
    const r = buildProduct({ ...validInput(), nombre: '   ' })
    expect(isErr(r)).toBe(true)
  })

  it('rechaza urlImagen vacía', () => {
    const r = buildProduct({ ...validInput(), urlImagen: '   ' })
    expect(isErr(r)).toBe(true)
  })

  it('rechaza precio no positivo', () => {
    expect(isErr(buildProduct({ ...validInput(), precioCrc: 0 }))).toBe(true)
    expect(isErr(buildProduct({ ...validInput(), precioCrc: -1 }))).toBe(true)
  })

  it('rechaza precio no entero', () => {
    expect(isErr(buildProduct({ ...validInput(), precioCrc: 18000.5 }))).toBe(true)
  })

  it('acepta orden de presentación cero, rechaza negativo', () => {
    expect(isOk(buildProduct({ ...validInput(), ordenPresentacion: 0 }))).toBe(true)
    expect(isErr(buildProduct({ ...validInput(), ordenPresentacion: -1 }))).toBe(true)
  })

  it('rechaza orden de presentación no entero', () => {
    expect(isErr(buildProduct({ ...validInput(), ordenPresentacion: 1.5 }))).toBe(true)
  })

  it('acumula varios problemas en un solo error', () => {
    const r = buildProduct({
      ...validInput(),
      slug: '',
      nombre: '',
      ordenPresentacion: -5,
    })
    expect(isErr(r)).toBe(true)
    if (!isErr(r)) return
    expect(r.error.problems.length).toBeGreaterThanOrEqual(3)
  })
})

describe('markProductInactive', () => {
  it('devuelve una copia inactiva sin mutar la original', () => {
    const r = buildProduct(validInput())
    if (!isOk(r)) throw new Error('esperaba ok')
    const original = r.value
    const inactivo = markProductInactive(original)
    expect(inactivo.activo).toBe(false)
    expect(original.activo).toBe(true)
    expect(inactivo.id).toBe(original.id)
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
  it('sanitiza la URL de imagen de un PublicProduct no confiable (CMS/DB)', () => {
    const tarjeta = toProductCard({
      id: '1',
      name: 'Producto',
      imageUrl: 'javascript:alert(1)',
      priceCrc: 18000,
      isActive: true,
    })
    expect(tarjeta.imageUrl).toBe('')
  })

  it('conserva una URL de imagen segura', () => {
    const tarjeta = toProductCard({
      id: '1',
      name: 'Producto',
      imageUrl: '/productos/serum.jpg',
      priceCrc: 18000,
      isActive: true,
    })
    expect(tarjeta.imageUrl).toBe('/productos/serum.jpg')
  })
})
