import { describe, it, expect } from 'vitest'
import { promotionFormSchema } from '@/features/catalog/ui/promotions/validation/promotion-schema'

const validForm = {
  targetType: 'technique',
  targetId: 't1',
  discountPercent: '20',
  startsAt: '2026-01-01T10:00',
  endsAt: '2026-01-31T10:00',
}

describe('promotionFormSchema (DOM-007 — validación en el borde)', () => {
  it('convierte los strings del formulario en el PromotionWriteModel (técnica)', () => {
    const parsed = promotionFormSchema.safeParse(validForm)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.target).toEqual({ type: 'technique', techniqueId: 't1' })
    expect(parsed.data.discountPercent).toBe(20)
    expect(parsed.data.startsAt).toBeInstanceOf(Date)
    expect(parsed.data.endsAt).toBeInstanceOf(Date)
  })

  it('convierte targetType=package en un target de paquete', () => {
    const parsed = promotionFormSchema.safeParse({
      ...validForm,
      targetType: 'package',
      targetId: 'pk1',
    })
    if (!parsed.success) throw new Error('esperaba éxito')
    expect(parsed.data.target).toEqual({ type: 'package', packageId: 'pk1' })
  })

  it('rechaza targetType inválido', () => {
    const parsed = promotionFormSchema.safeParse({ ...validForm, targetType: 'otro' })
    expect(parsed.success).toBe(false)
  })

  it('rechaza targetId vacío', () => {
    const parsed = promotionFormSchema.safeParse({ ...validForm, targetId: '   ' })
    expect(parsed.success).toBe(false)
  })

  it('rechaza descuento fuera de rango o no entero', () => {
    expect(promotionFormSchema.safeParse({ ...validForm, discountPercent: '0' }).success).toBe(false)
    expect(promotionFormSchema.safeParse({ ...validForm, discountPercent: '101' }).success).toBe(false)
    expect(promotionFormSchema.safeParse({ ...validForm, discountPercent: '20.5' }).success).toBe(
      false,
    )
  })

  it('rechaza fechas vacías', () => {
    expect(promotionFormSchema.safeParse({ ...validForm, startsAt: '' }).success).toBe(false)
    expect(promotionFormSchema.safeParse({ ...validForm, endsAt: '' }).success).toBe(false)
  })

  it('acumula varios problemas en un solo resultado', () => {
    const parsed = promotionFormSchema.safeParse({
      targetType: 'otro',
      targetId: '',
      discountPercent: '0',
      startsAt: '',
      endsAt: '',
    })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    expect(parsed.error.issues.length).toBeGreaterThanOrEqual(3)
  })
})
