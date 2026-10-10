import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  buildPromotion,
  markPromotionInactive,
  promotionToView,
  isPromotionCurrentlyActive,
} from '@/features/catalog/domain/promotions/promotion'
import { isPromotionValidationError } from '@/features/catalog/domain/promotions/errors'

const validTechniqueInput = () => ({
  id: '22222222-2222-2222-2222-222222222222',
  target: { type: 'technique' as const, techniqueId: '11111111-1111-1111-1111-111111111111' },
  discountPercent: 20,
  startsAt: new Date('2026-01-01T00:00:00Z'),
  endsAt: new Date('2026-01-31T00:00:00Z'),
})

describe('buildPromotion — invariantes de dominio (DOM-007, criterio 1)', () => {
  it('crea una promoción válida sobre una técnica', () => {
    const result = buildPromotion(validTechniqueInput())
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.target).toEqual({
      type: 'technique',
      techniqueId: '11111111-1111-1111-1111-111111111111',
    })
    expect(result.value.discountPercent).toBe(20)
    expect(result.value.isActive).toBe(true)
  })

  it('crea una promoción válida sobre un paquete', () => {
    const result = buildPromotion({
      ...validTechniqueInput(),
      target: { type: 'package', packageId: '33333333-3333-3333-3333-333333333333' },
    })
    expect(isOk(result)).toBe(true)
  })

  it('rechaza una técnica aplicable vacía', () => {
    const result = buildPromotion({
      ...validTechniqueInput(),
      target: { type: 'technique', techniqueId: '   ' },
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(isPromotionValidationError(result.error)).toBe(true)
    expect(result.error.problems.join(' ')).toMatch(/técnica aplicable/i)
  })

  it('rechaza un paquete aplicable vacío', () => {
    const result = buildPromotion({
      ...validTechniqueInput(),
      target: { type: 'package', packageId: '' },
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error.problems.join(' ')).toMatch(/paquete aplicable/i)
  })

  it('rechaza descuento no positivo, mayor a 100 o no entero', () => {
    expect(isErr(buildPromotion({ ...validTechniqueInput(), discountPercent: 0 }))).toBe(true)
    expect(isErr(buildPromotion({ ...validTechniqueInput(), discountPercent: -5 }))).toBe(true)
    expect(isErr(buildPromotion({ ...validTechniqueInput(), discountPercent: 101 }))).toBe(true)
    expect(isErr(buildPromotion({ ...validTechniqueInput(), discountPercent: 20.5 }))).toBe(true)
  })

  it('acepta el borde superior del descuento (100)', () => {
    expect(isOk(buildPromotion({ ...validTechniqueInput(), discountPercent: 100 }))).toBe(true)
  })

  it('rechaza una vigencia donde endsAt no es posterior a startsAt', () => {
    const sameInstant = new Date('2026-01-01T00:00:00Z')
    const result = buildPromotion({
      ...validTechniqueInput(),
      startsAt: sameInstant,
      endsAt: sameInstant,
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error.problems.join(' ')).toMatch(/terminar después de empezar/i)

    expect(
      isErr(
        buildPromotion({
          ...validTechniqueInput(),
          startsAt: new Date('2026-02-01T00:00:00Z'),
          endsAt: new Date('2026-01-01T00:00:00Z'),
        }),
      ),
    ).toBe(true)
  })

  it('acumula varios problemas en un solo error', () => {
    const result = buildPromotion({
      ...validTechniqueInput(),
      target: { type: 'technique', techniqueId: '' },
      discountPercent: 0,
      startsAt: new Date('2026-02-01T00:00:00Z'),
      endsAt: new Date('2026-01-01T00:00:00Z'),
    })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error.problems.length).toBeGreaterThanOrEqual(3)
  })
})

describe('Promotion — comportamiento', () => {
  it('solo buildPromotion marca una Promotion, y markPromotionInactive conserva la marca', () => {
    const result = buildPromotion(validTechniqueInput())
    if (!isOk(result)) throw new Error('setup')
    expect(Object.getOwnPropertySymbols(result.value)).toHaveLength(1)
    expect(Object.getOwnPropertySymbols(markPromotionInactive(result.value))).toEqual(
      Object.getOwnPropertySymbols(result.value),
    )
  })

  it('markPromotionInactive devuelve una copia inactiva sin mutar la original', () => {
    const result = buildPromotion(validTechniqueInput())
    if (!isOk(result)) throw new Error('esperaba ok')
    const original = result.value
    const inactive = markPromotionInactive(original)
    expect(inactive.isActive).toBe(false)
    expect(original.isActive).toBe(true)
    expect(inactive.id).toBe(original.id)
  })

  it('promotionToView expone fechas ISO y el descuento como número', () => {
    const result = buildPromotion(validTechniqueInput())
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(promotionToView(result.value)).toEqual({
      id: '22222222-2222-2222-2222-222222222222',
      target: { type: 'technique', techniqueId: '11111111-1111-1111-1111-111111111111' },
      discountPercent: 20,
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-01-31T00:00:00.000Z',
      isActive: true,
    })
  })
})

describe('isPromotionCurrentlyActive — criterio 3, reloj inyectado (DOM-004)', () => {
  it('es vigente dentro de su ventana y activa', () => {
    const result = buildPromotion(validTechniqueInput())
    if (!isOk(result)) throw new Error('setup')
    expect(isPromotionCurrentlyActive(result.value, new Date('2026-01-15T00:00:00Z'))).toBe(true)
  })

  it('deja de ser vigente automáticamente tras ends_at, sin ninguna desactivación manual', () => {
    const result = buildPromotion(validTechniqueInput())
    if (!isOk(result)) throw new Error('setup')
    expect(isPromotionCurrentlyActive(result.value, new Date('2026-02-01T00:00:00Z'))).toBe(false)
  })

  it('no es vigente antes de startsAt', () => {
    const result = buildPromotion(validTechniqueInput())
    if (!isOk(result)) throw new Error('setup')
    expect(isPromotionCurrentlyActive(result.value, new Date('2025-12-31T00:00:00Z'))).toBe(false)
  })

  it('una promoción pausada manualmente (isActive=false) no es vigente aunque esté en ventana', () => {
    const result = buildPromotion(validTechniqueInput())
    if (!isOk(result)) throw new Error('setup')
    const paused = markPromotionInactive(result.value)
    expect(isPromotionCurrentlyActive(paused, new Date('2026-01-15T00:00:00Z'))).toBe(false)
  })

  it('incluye los bordes starts_at y ends_at como vigentes', () => {
    const result = buildPromotion(validTechniqueInput())
    if (!isOk(result)) throw new Error('setup')
    expect(isPromotionCurrentlyActive(result.value, new Date('2026-01-01T00:00:00Z'))).toBe(true)
    expect(isPromotionCurrentlyActive(result.value, new Date('2026-01-31T00:00:00Z'))).toBe(true)
  })
})
