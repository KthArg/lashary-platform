import { describe, it, expect } from 'vitest'
import { techniqueFormSchema } from '@/features/catalog/ui/schema'

const validForm = {
  name: 'Set volumen',
  family: 'lash_volume',
  priceFirstTime: '32000',
  priceRetouch: '19000',
  durationFirstTimeMin: '150',
  durationRetouchMin: '90',
  bufferMin: '15',
  reapplicationIntervalDays: '21',
  deposit: '12000',
  aftercareText: 'Cuidados posteriores.',
}

describe('techniqueFormSchema (DOM-007 — validación en el borde)', () => {
  it('convierte los strings del formulario en el TechniqueWriteModel', () => {
    const parsed = techniqueFormSchema.safeParse(validForm)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data).toEqual({
      name: 'Set volumen',
      family: 'lash_volume',
      priceFirstTime: 32000,
      priceRetouch: 19000,
      durationFirstTimeMin: 150,
      durationRetouchMin: 90,
      bufferMin: 15,
      reapplicationIntervalDays: 21,
      deposit: 12000,
      aftercareText: 'Cuidados posteriores.',
    })
  })

  it('mapea los campos opcionales vacíos a null', () => {
    const parsed = techniqueFormSchema.safeParse({
      ...validForm,
      priceRetouch: '',
      durationRetouchMin: '',
      reapplicationIntervalDays: '',
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.priceRetouch).toBeNull()
    expect(parsed.data.durationRetouchMin).toBeNull()
    expect(parsed.data.reapplicationIntervalDays).toBeNull()
  })

  it('recorta el nombre y el texto de cuidados', () => {
    const parsed = techniqueFormSchema.safeParse({
      ...validForm,
      name: '  Set volumen  ',
      aftercareText: '  cuidados  ',
    })
    if (!parsed.success) throw new Error('esperaba éxito')
    expect(parsed.data.name).toBe('Set volumen')
    expect(parsed.data.aftercareText).toBe('cuidados')
  })

  it('rechaza nombre vacío, familia inválida y precio no positivo', () => {
    const parsed = techniqueFormSchema.safeParse({
      ...validForm,
      name: '   ',
      family: 'tattoo',
      priceFirstTime: '0',
    })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.length).toBeGreaterThanOrEqual(3)
  })

  it('acepta buffer y anticipo en cero', () => {
    const parsed = techniqueFormSchema.safeParse({
      ...validForm,
      bufferMin: '0',
      deposit: '0',
    })
    expect(parsed.success).toBe(true)
  })

  it('rechaza un precio no entero', () => {
    const parsed = techniqueFormSchema.safeParse({
      ...validForm,
      priceFirstTime: '32000.5',
    })
    expect(parsed.success).toBe(false)
  })
})
