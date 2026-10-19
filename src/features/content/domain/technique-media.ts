import type { CmsImage } from './landing-content'

export const TECHNIQUE_MEDIA_KEY = 'tecnicas'

export const TECHNIQUE_EXAMPLE_FIELDS = ['ejemplo1', 'ejemplo2', 'ejemplo3'] as const

export type TechniqueMedia = {
  image: CmsImage
  examples: CmsImage[]
}

export type TechniqueMediaByFamily = Readonly<Record<string, TechniqueMedia>>
