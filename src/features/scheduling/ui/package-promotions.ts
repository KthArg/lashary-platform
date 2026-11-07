import type { PromotionView } from '@/features/catalog'

export function bestActiveDiscountsByPackage(
  activePromotions: readonly PromotionView[],
): ReadonlyMap<string, number> {
  const discounts = new Map<string, number>()
  for (const promotion of activePromotions) {
    if (promotion.target.type !== 'package') continue
    const current = discounts.get(promotion.target.packageId)
    if (current === undefined || promotion.discountPercent > current) {
      discounts.set(promotion.target.packageId, promotion.discountPercent)
    }
  }
  return discounts
}
