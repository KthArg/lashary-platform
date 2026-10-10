import { isOk } from '@/shared/result'
import { buildPromotion, type Promotion, type PromotionTarget } from '@/features/catalog/domain/promotions/promotion'

let counter = 0

export function makePromotion(
  overrides: Partial<{
    id: string
    target: PromotionTarget
    discountPercent: number
    startsAt: Date
    endsAt: Date
    isActive: boolean
  }> = {},
): Promotion {
  counter += 1
  const result = buildPromotion({
    id: overrides.id ?? `promo-${counter}`,
    target: overrides.target ?? { type: 'technique', techniqueId: `t-${counter}` },
    discountPercent: overrides.discountPercent ?? 20,
    startsAt: overrides.startsAt ?? new Date('2026-01-01T00:00:00Z'),
    endsAt: overrides.endsAt ?? new Date('2026-01-31T00:00:00Z'),
    isActive: overrides.isActive ?? true,
  })
  if (!isOk(result)) {
    throw new Error(`fixture inválida: ${result.error.message}`)
  }
  return result.value
}
