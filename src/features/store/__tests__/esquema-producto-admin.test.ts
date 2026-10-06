import { describe, it, expect } from 'vitest'
import { esquemaProductoAdmin } from '@/features/store/actions/esquema-producto-admin'

const validForm = {
  slug: 'serum-nutritivo-lashary',
  nombre: 'Serum nutritivo Lashary',
  descripcion: 'Tratamiento nutritivo para mantenimiento de pestañas.',
  urlImagen: '/productos/serum-nutritivo.jpg',
  precioCrc: '18000',
  ordenPresentacion: '1',
}

describe('esquemaProductoAdmin (DOM-007 — validación en el borde)', () => {
  it('convierte los strings del formulario en el ProductoEscritura', () => {
    const parsed = esquemaProductoAdmin.safeParse(validForm)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data).toEqual({
      slug: 'serum-nutritivo-lashary',
      nombre: 'Serum nutritivo Lashary',
      descripcion: 'Tratamiento nutritivo para mantenimiento de pestañas.',
      urlImagen: '/productos/serum-nutritivo.jpg',
      precioCrc: 18000,
      ordenPresentacion: 1,
    })
  })

  it('mapea la descripción ausente a cadena vacía', () => {
    const { descripcion, ...sinDescripcion } = validForm
    const parsed = esquemaProductoAdmin.safeParse(sinDescripcion)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.descripcion).toBe('')
  })

  it('recorta slug, nombre y descripción', () => {
    const parsed = esquemaProductoAdmin.safeParse({
      ...validForm,
      slug: '  serum-nutritivo-lashary  ',
      nombre: '  Serum nutritivo Lashary  ',
      descripcion: '  cuidados  ',
    })
    if (!parsed.success) throw new Error('esperaba éxito')
    expect(parsed.data.slug).toBe('serum-nutritivo-lashary')
    expect(parsed.data.nombre).toBe('Serum nutritivo Lashary')
    expect(parsed.data.descripcion).toBe('cuidados')
  })

  it('rechaza slug vacío, nombre vacío y precio no positivo', () => {
    const parsed = esquemaProductoAdmin.safeParse({
      ...validForm,
      slug: '   ',
      nombre: '   ',
      precioCrc: '0',
    })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.length).toBeGreaterThanOrEqual(3)
  })

  it('acepta orden de presentación en cero', () => {
    const parsed = esquemaProductoAdmin.safeParse({ ...validForm, ordenPresentacion: '0' })
    expect(parsed.success).toBe(true)
  })

  it('rechaza un precio no entero', () => {
    const parsed = esquemaProductoAdmin.safeParse({ ...validForm, precioCrc: '18000.5' })
    expect(parsed.success).toBe(false)
  })

  it('rechaza un orden de presentación negativo', () => {
    const parsed = esquemaProductoAdmin.safeParse({ ...validForm, ordenPresentacion: '-1' })
    expect(parsed.success).toBe(false)
  })
})
