import type { TechniqueView } from '@/features/catalog'
import type { CmsImage, TechniqueMediaByFamily } from '@/features/content'
import { techniqueDescriptions } from './messages'

// Lo que la sección de técnicas necesita para pintarse: la vista pública del catálogo
// (ARCH-003, entry point de `catalog`) reducida a lo que se ve, más la descripción del sitio.
// Se arma en el servidor para que el componente de cliente no arrastre la feature `catalog`
// —ni su cliente de Supabase— al bundle del navegador.
export type LandingTechnique = {
  id: string
  name: string
  description: string | null
  priceFirstTime: number
  priceRetouch: number | null
  durationFirstTimeMin: number
  durationRetouchMin: number | null
  // Fotos del CMS (docs/contracts/cms-api.md § `tecnicas`), cruzadas por familia. Una técnica
  // sin fila en el CMS se muestra sin fotos: el catálogo manda qué técnicas existen.
  image: CmsImage | null
  examples: readonly CmsImage[]
}

export function toLandingTechnique(
  technique: TechniqueView,
  media: TechniqueMediaByFamily = {},
): LandingTechnique {
  const fotos = media[technique.family]

  return {
    id: technique.id,
    name: technique.name,
    description: techniqueDescriptions[technique.family] ?? null,
    priceFirstTime: technique.priceFirstTime,
    priceRetouch: technique.priceRetouch,
    durationFirstTimeMin: technique.durationFirstTimeMin,
    durationRetouchMin: technique.durationRetouchMin,
    image: fotos?.image ?? null,
    examples: fotos?.examples ?? [],
  }
}

const colones = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
})

// El catálogo entrega colones enteros (ADR-0004); darles forma es cosa del sitio.
export const formatColones = (value: number): string => colones.format(value)
