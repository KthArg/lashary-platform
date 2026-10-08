import { describe, it, expect } from 'vitest'
import { esquemaProductoAdmin } from '@/features/store/ui/admin-products/validation/product-schema'

const validForm = {
  slug: 'serum-nutritivo-lashary',
  name: 'Serum nutritivo Lashary',
  description: 'Tratamiento nutritivo para mantenimiento de pestañas.',
  imageUrl: '/productos/serum-nutritivo.jpg',
  priceCrc: '18000',
  displayOrder: '1',
}

describe('esquemaProductoAdmin (DOM-007 — validación en el borde)', () => {
  it('convierte los strings del formulario en el ProductWrite', () => {
    const parsed = esquemaProductoAdmin.safeParse(validForm)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data).toEqual({
      slug: 'serum-nutritivo-lashary',
      name: 'Serum nutritivo Lashary',
      description: 'Tratamiento nutritivo para mantenimiento de pestañas.',
      imageUrl: '/productos/serum-nutritivo.jpg',
      priceCrc: 18000,
      displayOrder: 1,
    })
  })

  it('mapea la descripción ausente a cadena vacía', () => {
    const { description, ...sinDescripcion } = validForm
    const parsed = esquemaProductoAdmin.safeParse(sinDescripcion)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.description).toBe('')
  })

  it('recorta slug, nombre y descripción', () => {
    const parsed = esquemaProductoAdmin.safeParse({
      ...validForm,
      slug: '  serum-nutritivo-lashary  ',
      name: '  Serum nutritivo Lashary  ',
      description: '  cuidados  ',
    })
    if (!parsed.success) throw new Error('esperaba éxito')
    expect(parsed.data.slug).toBe('serum-nutritivo-lashary')
    expect(parsed.data.name).toBe('Serum nutritivo Lashary')
    expect(parsed.data.description).toBe('cuidados')
  })

  it('rechaza slug vacío, nombre vacío y precio no positivo', () => {
    const parsed = esquemaProductoAdmin.safeParse({
      ...validForm,
      slug: '   ',
      name: '   ',
      priceCrc: '0',
    })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.length).toBeGreaterThanOrEqual(3)
  })

  it('acepta orden de presentación en cero', () => {
    const parsed = esquemaProductoAdmin.safeParse({ ...validForm, displayOrder: '0' })
    expect(parsed.success).toBe(true)
  })

  it('rechaza un precio no entero', () => {
    const parsed = esquemaProductoAdmin.safeParse({ ...validForm, priceCrc: '18000.5' })
    expect(parsed.success).toBe(false)
  })

  it('rechaza un orden de presentación negativo', () => {
    const parsed = esquemaProductoAdmin.safeParse({ ...validForm, displayOrder: '-1' })
    expect(parsed.success).toBe(false)
  })
})
