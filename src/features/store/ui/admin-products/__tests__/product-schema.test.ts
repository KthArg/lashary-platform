import { describe, it, expect } from 'vitest'
import { productSchema } from '@/features/store/ui/admin-products/validation/product-schema'
import { productStrings } from '@/features/store/ui/admin-products/constants/product-strings'

const validForm = {
  name: 'Serum nutritivo Lashary',
  description: 'Tratamiento nutritivo para mantenimiento de pestañas.',
  priceCrc: '18000',
  displayOrder: '1',
  stock: '5',
}

describe('productSchema (DOM-007 — validación en el borde)', () => {
  it('convierte los strings del formulario en el ProductWrite', () => {
    const parsed = productSchema.safeParse(validForm)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data).toEqual({
      name: 'Serum nutritivo Lashary',
      description: 'Tratamiento nutritivo para mantenimiento de pestañas.',
      priceCrc: 18000,
      displayOrder: 1,
      stock: 5,
    })
  })

  it('mapea la descripción ausente a cadena vacía', () => {
    const { description, ...withoutDescription } = validForm
    const parsed = productSchema.safeParse(withoutDescription)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.description).toBe('')
  })

  it('recorta nombre y descripción', () => {
    const parsed = productSchema.safeParse({
      ...validForm,
      name: '  Serum nutritivo Lashary  ',
      description: '  cuidados  ',
    })
    if (!parsed.success) throw new Error('esperaba éxito')
    expect(parsed.data.name).toBe('Serum nutritivo Lashary')
    expect(parsed.data.description).toBe('cuidados')
  })

  it('rechaza nombre vacío y precio no positivo', () => {
    const parsed = productSchema.safeParse({
      ...validForm,
      name: '   ',
      priceCrc: '0',
    })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.length).toBeGreaterThanOrEqual(2)
  })

  it('rechaza un nombre sin letras ni números, porque no daría un slug', () => {
    const parsed = productSchema.safeParse({ ...validForm, name: '¡¡!!' })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.map((issue) => issue.message)).toContain(
      productStrings.form.validation.nameWithoutLetters,
    )
  })

  it('descarta un slug enviado en el formulario: lo decide el sistema', () => {
    const parsed = productSchema.safeParse({ ...validForm, slug: 'slug-inyectado' })
    if (!parsed.success) throw new Error('esperaba éxito')
    expect(parsed.data).not.toHaveProperty('slug')
  })

  it('acepta orden de presentación en cero', () => {
    const parsed = productSchema.safeParse({ ...validForm, displayOrder: '0' })
    expect(parsed.success).toBe(true)
  })

  it('rechaza un precio no entero', () => {
    const parsed = productSchema.safeParse({ ...validForm, priceCrc: '18000.5' })
    expect(parsed.success).toBe(false)
  })

  it('rechaza un orden de presentación negativo', () => {
    const parsed = productSchema.safeParse({ ...validForm, displayOrder: '-1' })
    expect(parsed.success).toBe(false)
  })

  it('acepta cero existencias escritas a propósito', () => {
    const parsed = productSchema.safeParse({ ...validForm, stock: '0' })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.stock).toBe(0)
  })

  it('rechaza el campo de existencias vacío en vez de convertirlo en cero', () => {
    const parsed = productSchema.safeParse({ ...validForm, stock: '   ' })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.map((issue) => issue.message)).toContain(
      productStrings.form.validation.stockRequired,
    )
  })

  it('rechaza el formulario sin el campo de existencias', () => {
    const { stock, ...withoutStock } = validForm
    const parsed = productSchema.safeParse(withoutStock)
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.map((issue) => issue.message)).toContain(
      productStrings.form.validation.stockRequired,
    )
  })

  it('rechaza existencias negativas o con decimales', () => {
    expect(productSchema.safeParse({ ...validForm, stock: '-1' }).success).toBe(false)
    expect(productSchema.safeParse({ ...validForm, stock: '2.5' }).success).toBe(false)
  })
})
