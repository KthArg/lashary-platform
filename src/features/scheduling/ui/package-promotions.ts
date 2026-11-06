import type { PromotionView } from '@/features/catalog'

// D-PROM-3: si un paquete tiene más de una promoción vigente a la vez, gana la de mayor
// descuento — el desempate por vigencia no cambia el número que se muestra acá (mismo criterio
// que bestActiveDiscountsByTechnique en landing/ui/technique-view.ts, replicado porque domain/
// no puede importar @/features/catalog, ARCH-004).
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
