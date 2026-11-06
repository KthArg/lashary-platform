import { applyDiscount, type PromotionView, type TechniqueView } from '@/features/catalog'
import type { CmsImage, TechniqueMediaByFamily } from '@/features/content'
import { techniqueDescriptions } from './constants/landing-strings'

export type LandingTechnique = {
  id: string
  name: string
  description: string | null
  priceFirstTime: number
  priceRetouch: number | null
  durationFirstTimeMin: number
  durationRetouchMin: number | null
  image: CmsImage | null
  examples: readonly CmsImage[]
  discountPercent: number | null
  priceFirstTimeDiscounted: number | null
  priceRetouchDiscounted: number | null
}

export function toLandingTechnique(
  technique: TechniqueView,
  media: TechniqueMediaByFamily = {},
  discountPercent: number | null = null,
): LandingTechnique {
  const photos = media[technique.family]

  return {
    id: technique.id,
    name: technique.name,
    description: techniqueDescriptions[technique.family] ?? null,
    priceFirstTime: technique.priceFirstTime,
    priceRetouch: technique.priceRetouch,
    durationFirstTimeMin: technique.durationFirstTimeMin,
    durationRetouchMin: technique.durationRetouchMin,
    image: photos?.image ?? null,
    examples: photos?.examples ?? [],
    discountPercent,
    priceFirstTimeDiscounted:
      discountPercent !== null ? applyDiscount(technique.priceFirstTime, discountPercent) : null,
    priceRetouchDiscounted:
      discountPercent !== null && technique.priceRetouch !== null
        ? applyDiscount(technique.priceRetouch, discountPercent)
        : null,
  }
}

// Criterio 2 (US-PROM-01): si una técnica tiene más de una promoción vigente a la vez, gana la
// de mayor descuento (D-PROM-3) — el empate por vigencia de ese decisión no cambia el número que
// se muestra acá, así que no hace falta repetirlo.
export function bestActiveDiscountsByTechnique(
  activePromotions: readonly PromotionView[],
): ReadonlyMap<string, number> {
  const discounts = new Map<string, number>()
  for (const promotion of activePromotions) {
    if (promotion.target.type !== 'technique') continue
    const current = discounts.get(promotion.target.techniqueId)
    if (current === undefined || promotion.discountPercent > current) {
      discounts.set(promotion.target.techniqueId, promotion.discountPercent)
    }
  }
  return discounts
}
