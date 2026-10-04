import { describe, it, expect } from 'vitest'
import { packageFormSchema } from '@/features/catalog/ui/packages/validation/package-schema'

const validForm = {
  name: 'Combo cejas',
  techniqueIds: ['t1', 't2'],
  price: '30000',
  deposit: '0',
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
      deposit: 0,
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

describe('anticipo del formulario de paquetes', () => {
  it.each(['0', '9000', '9007199254740991'])('acepta el anticipo %s en colones enteros', (deposit) => {
    const result = packageFormSchema.safeParse({ ...validForm, deposit })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.deposit).toBe(Number(deposit))
  })
  it.each(['', ' ', '-1', '1.5', '1.0000000000000001', '9007199254740993', null, undefined])('rechaza el anticipo inválido %s', (deposit) => {
    expect(packageFormSchema.safeParse({ ...validForm, deposit }).success).toBe(false)
  })
})
