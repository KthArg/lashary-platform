import { describe, it, expect } from 'vitest'
import type { PromotionView } from '@/features/catalog'
import { bestActiveDiscountsByPackage } from '../package-promotions'

const makePromotion = (overrides: Partial<PromotionView> = {}): PromotionView => ({
  id: '22222222-2222-4222-8222-222222222222',
  target: { type: 'package', packageId: '33333333-3333-4333-8333-333333333333' },
  discountPercent: 20,
  startsAt: '2026-01-01T00:00:00Z',
  endsAt: '2026-01-31T00:00:00Z',
  isActive: true,
  ...overrides,
})

describe('bestActiveDiscountsByPackage — D-PROM-3, mayor descuento gana', () => {
  it('sin promociones, el mapa queda vacío', () => {
    expect(bestActiveDiscountsByPackage([]).size).toBe(0)
  })

  it('una promoción sobre un paquete', () => {
    const discounts = bestActiveDiscountsByPackage([makePromotion()])
    expect(discounts.get('33333333-3333-4333-8333-333333333333')).toBe(20)
  })

  it('dos promociones vigentes a la vez sobre el mismo paquete: gana la de mayor descuento', () => {
    const discounts = bestActiveDiscountsByPackage([
      makePromotion({ id: 'a', discountPercent: 10 }),
      makePromotion({ id: 'b', discountPercent: 30 }),
    ])
    expect(discounts.get('33333333-3333-4333-8333-333333333333')).toBe(30)
  })

  it('ignora promociones sobre técnica: esta pantalla solo destaca promociones de paquete', () => {
    const discounts = bestActiveDiscountsByPackage([
      makePromotion({ target: { type: 'technique', techniqueId: 't1' } }),
    ])
    expect(discounts.size).toBe(0)
  })
})
