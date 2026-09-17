import type { CmsImage } from './landing-content'

// Fotos de una técnica (docs/contracts/cms-api.md v1.1, colección `tecnicas`). El CMS aporta
// **solo las fotos**: el nombre, el precio y la duración son del catálogo.
export const TECHNIQUE_MEDIA_KEY = 'tecnicas'

// Cuántas ranuras de ejemplo declara el contrato. uno-cms no tiene campo de lista de imágenes.
export const TECHNIQUE_EXAMPLE_FIELDS = ['ejemplo1', 'ejemplo2', 'ejemplo3'] as const

export type TechniqueMedia = {
  image: CmsImage
  examples: CmsImage[]
}

// Indexado por `familia`, que es la llave de cruce con el catálogo. Una familia sin fotos
// simplemente no está: quien la busque se queda sin imagen, que es el caso previsto.
export type TechniqueMediaByFamily = Readonly<Record<string, TechniqueMedia>>
