import type { TechniqueView } from '@/features/catalog'
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
}

export function toLandingTechnique(
  technique: TechniqueView,
  media: TechniqueMediaByFamily = {},
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
  }
}

const colonFormatter = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
})

export const formatColones = (value: number): string => colonFormatter.format(value)
