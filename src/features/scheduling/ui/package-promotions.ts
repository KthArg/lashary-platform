import type { PromotionView } from '@/features/catalog'

function bestDiscountsByTarget(
  activePromotions: readonly PromotionView[],
  targetIdOf: (promotion: PromotionView) => string | null,
): ReadonlyMap<string, number> {
  const discounts = new Map<string, number>()
  for (const promotion of activePromotions) {
    const targetId = targetIdOf(promotion)
    if (targetId === null) continue
    const current = discounts.get(targetId)
    if (current === undefined || promotion.discountPercent > current) {
      discounts.set(targetId, promotion.discountPercent)
    }
  }
  return discounts
}

export function bestActiveDiscountsByPackage(
  activePromotions: readonly PromotionView[],
): ReadonlyMap<string, number> {
  return bestDiscountsByTarget(activePromotions, (promotion) =>
    promotion.target.type === 'package' ? promotion.target.packageId : null,
  )
}

export function bestActiveDiscountsByTechnique(
  activePromotions: readonly PromotionView[],
): ReadonlyMap<string, number> {
  return bestDiscountsByTarget(activePromotions, (promotion) =>
    promotion.target.type === 'technique' ? promotion.target.techniqueId : null,
  )
}
