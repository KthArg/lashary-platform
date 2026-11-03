import { describe, it, expect } from 'vitest'
import { promotionFormSchema } from '@/features/catalog/ui/promotions/validation/promotion-schema'

const TECHNIQUE_ID = '00000000-0000-4000-8000-000000000001'
const PACKAGE_ID = '00000000-0000-4000-8000-000000000002'

const validForm = {
  targetType: 'technique',
  targetId: TECHNIQUE_ID,
  discountPercent: '20',
  startsAt: '2026-01-01T10:00',
  endsAt: '2026-01-31T10:00',
}

describe('promotionFormSchema (DOM-007 — validación en el borde)', () => {
  it('convierte los strings del formulario en el PromotionWriteModel (técnica)', () => {
    const parsed = promotionFormSchema.safeParse(validForm)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.target).toEqual({ type: 'technique', techniqueId: TECHNIQUE_ID })
    expect(parsed.data.discountPercent).toBe(20)
    expect(parsed.data.startsAt).toBeInstanceOf(Date)
    expect(parsed.data.endsAt).toBeInstanceOf(Date)
  })

  it('convierte targetType=package en un target de paquete', () => {
    const parsed = promotionFormSchema.safeParse({
      ...validForm,
      targetType: 'package',
      targetId: PACKAGE_ID,
    })
    if (!parsed.success) throw new Error('esperaba éxito')
    expect(parsed.data.target).toEqual({ type: 'package', packageId: PACKAGE_ID })
  })

  it('rechaza targetType inválido', () => {
    const parsed = promotionFormSchema.safeParse({ ...validForm, targetType: 'otro' })
    expect(parsed.success).toBe(false)
  })

  it('rechaza targetId vacío o que no tiene forma de uuid (auditoría B4, 2026-11-02)', () => {
    expect(promotionFormSchema.safeParse({ ...validForm, targetId: '   ' }).success).toBe(false)
    expect(promotionFormSchema.safeParse({ ...validForm, targetId: 't1' }).success).toBe(false)
    expect(promotionFormSchema.safeParse({ ...validForm, targetId: 'abc' }).success).toBe(false)
  })

  it('rechaza descuento fuera de rango, no entero, o el 100% (auditoría A2/C2: nunca se regala el servicio completo)', () => {
    expect(promotionFormSchema.safeParse({ ...validForm, discountPercent: '0' }).success).toBe(false)
    expect(promotionFormSchema.safeParse({ ...validForm, discountPercent: '100' }).success).toBe(false)
    expect(promotionFormSchema.safeParse({ ...validForm, discountPercent: '101' }).success).toBe(false)
    expect(promotionFormSchema.safeParse({ ...validForm, discountPercent: '20.5' }).success).toBe(
      false,
    )
    expect(promotionFormSchema.safeParse({ ...validForm, discountPercent: '99' }).success).toBe(true)
  })

  it('rechaza fechas vacías o sin forma de datetime-local', () => {
    expect(promotionFormSchema.safeParse({ ...validForm, startsAt: '' }).success).toBe(false)
    expect(promotionFormSchema.safeParse({ ...validForm, endsAt: '' }).success).toBe(false)
    expect(promotionFormSchema.safeParse({ ...validForm, startsAt: 'basura' }).success).toBe(false)
  })

  it('interpreta la fecha y hora en la zona del estudio, no la de quien corre el código (auditoría A1, 2026-11-02)', () => {
    const parsed = promotionFormSchema.safeParse({ ...validForm, startsAt: '2026-10-20T09:00' })
    if (!parsed.success) throw new Error('esperaba éxito')
    expect(parsed.data.startsAt.toISOString()).toBe('2026-10-20T15:00:00.000Z')
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
