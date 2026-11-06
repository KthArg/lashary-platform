import { describe, it, expect } from 'vitest'
import type { PromotionView, TechniqueView } from '@/features/catalog'
import { toLandingTechnique, bestActiveDiscountsByTechnique } from '../technique-view'

const makeTechnique = (overrides: Partial<TechniqueView> = {}): TechniqueView => ({
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Set clásico',
  family: 'lash_classic',
  priceFirstTime: 25000,
  priceRetouch: 15000,
  durationFirstTimeMin: 120,
  durationRetouchMin: 75,
  bufferMin: 15,
  reapplicationIntervalDays: 21,
  deposit: 10000,
  aftercareText: 'No mojar por 24 horas.',
  isActive: true,
  ...overrides,
})

const makePromotion = (overrides: Partial<PromotionView> = {}): PromotionView => ({
  id: '22222222-2222-4222-8222-222222222222',
  target: { type: 'technique', techniqueId: '11111111-1111-4111-8111-111111111111' },
  discountPercent: 20,
  startsAt: '2026-01-01T00:00:00Z',
  endsAt: '2026-01-31T00:00:00Z',
  isActive: true,
  ...overrides,
})

describe('toLandingTechnique — US-PROM-01 criterio 2 (landing)', () => {
  it('sin promoción, no hay precio rebajado', () => {
    const landing = toLandingTechnique(makeTechnique())
    expect(landing.discountPercent).toBeNull()
    expect(landing.priceFirstTimeDiscounted).toBeNull()
    expect(landing.priceRetouchDiscounted).toBeNull()
  })

  it('con promoción, rebaja el precio de primera vez y el de retoque con el mismo porcentaje, redondeado al colón (DOM-001)', () => {
    const landing = toLandingTechnique(makeTechnique(), {}, 20)
    expect(landing.discountPercent).toBe(20)
    expect(landing.priceFirstTimeDiscounted).toBe(20000)
    expect(landing.priceRetouchDiscounted).toBe(12000)
  })

  it('con promoción pero sin precio de retoque, no inventa un retoque rebajado', () => {
    const landing = toLandingTechnique(makeTechnique({ priceRetouch: null }), {}, 20)
    expect(landing.priceRetouchDiscounted).toBeNull()
  })
})

describe('bestActiveDiscountsByTechnique — D-PROM-3, mayor descuento gana', () => {
  it('sin promociones, el mapa queda vacío', () => {
    expect(bestActiveDiscountsByTechnique([]).size).toBe(0)
  })

  it('una promoción sobre una técnica', () => {
    const discounts = bestActiveDiscountsByTechnique([makePromotion()])
    expect(discounts.get('11111111-1111-4111-8111-111111111111')).toBe(20)
  })

  it('dos promociones vigentes a la vez sobre la misma técnica: gana la de mayor descuento', () => {
    const discounts = bestActiveDiscountsByTechnique([
      makePromotion({ id: 'a', discountPercent: 10 }),
      makePromotion({ id: 'b', discountPercent: 30 }),
    ])
    expect(discounts.get('11111111-1111-4111-8111-111111111111')).toBe(30)
  })

  it('ignora promociones sobre paquete: landing hoy solo muestra técnicas', () => {
    const discounts = bestActiveDiscountsByTechnique([
      makePromotion({ target: { type: 'package', packageId: 'p1' } }),
    ])
    expect(discounts.size).toBe(0)
  })
})
