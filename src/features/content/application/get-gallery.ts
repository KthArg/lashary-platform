import type { Result } from '@/shared/result'
import type { CmsUnavailable } from '../domain/errors'
import {
  GALLERY_FAMILIES,
  GALLERY_KEY,
  GALLERY_MAX_PAIRS,
  type GalleryFamily,
  type GalleryPair,
} from '../domain/gallery'
import { field, image } from './cms-values'
import type { CmsReader } from './ports'

export async function readRawGallery(reader: CmsReader): Promise<Result<unknown[], CmsUnavailable>> {
  return reader.readCollection(GALLERY_KEY)
}

const isGalleryFamily = (value: unknown): value is GalleryFamily =>
  typeof value === 'string' && (GALLERY_FAMILIES as readonly string[]).includes(value)

// Los pares que la landing puede publicar (docs/contracts/cms-api.md § `galeria`). Nunca lanza.
// Un par entra solo si la clienta autorizó (`consentimiento === true`), si trae las dos fotos
// con su `alt` y si su familia es del contrato; del resto, los 24 primeros del editor.
export function toGallery(items: unknown[] | null, mediaBaseUrl: string): GalleryPair[] {
  if (items === null) return []

  const pairs: GalleryPair[] = []
  for (const item of items) {
    if (pairs.length === GALLERY_MAX_PAIRS) break
    // Estricto a propósito: `"true"`, `1` o la ausencia no son una autorización.
    if (field(item, 'consentimiento') !== true) continue

    const family = field(item, 'familia')
    if (!isGalleryFamily(family)) continue

    const before = image(field(item, 'antes'), mediaBaseUrl)
    const after = image(field(item, 'despues'), mediaBaseUrl)
    // Una foto sola no es un par.
    if (before === null || after === null) continue

    pairs.push({ family, before, after })
  }
  return pairs
}
