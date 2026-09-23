import { describe, it, expect } from 'vitest'
import { packageFormSchema } from '@/features/catalog/ui/package-schema'

const validForm = {
  name: 'Combo cejas',
  techniqueIds: ['t1', 't2'],
  price: '30000',
}

describe('packageFormSchema (DOM-007 — validación en el borde)', () => {
  it('convierte los strings del formulario en el PackageWriteModel', () => {
    const parsed = packageFormSchema.safeParse(validForm)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data).toEqual({
      name: 'Combo cejas',
      techniqueIds: ['t1', 't2'],
      price: 30000,
    })
  })

  it('recorta el nombre', () => {
    const parsed = packageFormSchema.safeParse({ ...validForm, name: '  Combo cejas  ' })
    if (!parsed.success) throw new Error('esperaba éxito')
    expect(parsed.data.name).toBe('Combo cejas')
  })

  it('rechaza nombre vacío, menos de dos técnicas y precio no positivo (criterio 1)', () => {
    const parsed = packageFormSchema.safeParse({
      name: '   ',
      techniqueIds: ['t1'],
      price: '0',
    })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.length).toBeGreaterThanOrEqual(3)
  })

  it('rechaza lista de técnicas vacía', () => {
    const parsed = packageFormSchema.safeParse({ ...validForm, techniqueIds: [] })
    expect(parsed.success).toBe(false)
  })

  it('rechaza un precio no entero', () => {
    const parsed = packageFormSchema.safeParse({ ...validForm, price: '30000.5' })
    expect(parsed.success).toBe(false)
  })
})
