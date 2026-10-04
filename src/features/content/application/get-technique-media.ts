import type { Result } from '@/shared/result'
import type { CmsUnavailable } from '../domain/errors'
import {
  TECHNIQUE_EXAMPLE_FIELDS,
  TECHNIQUE_MEDIA_KEY,
  type TechniqueMediaByFamily,
} from '../domain/technique-media'
import { field, image, text } from './cms-values'
import type { CmsReader } from './ports'

export async function readRawTechniqueMedia(
  reader: CmsReader,
): Promise<Result<unknown[], CmsUnavailable>> {
  return reader.readCollection(TECHNIQUE_MEDIA_KEY)
}

// Indexa las fotos por familia. Nunca lanza y nunca exige que el CMS esté completo: una fila sin
// familia o sin foto principal válida se descarta, y de dos filas con la misma familia vale la
// primera en el orden del editor (docs/contracts/cms-api.md § `tecnicas`).
export function toTechniqueMedia(
  items: unknown[] | null,
  mediaBaseUrl: string,
): TechniqueMediaByFamily {
  if (items === null) return {}

  const byFamily: Record<string, TechniqueMediaByFamily[string]> = {}

  for (const item of items) {
    const family = text(field(item, 'familia'), 80)
    if (family === null || family in byFamily) continue

    const main = image(field(item, 'imagen'), mediaBaseUrl)
    // Sin foto principal la fila no ilustra nada: los ejemplos sueltos no sustituyen a la foto.
    if (main === null) continue

    const examples = TECHNIQUE_EXAMPLE_FIELDS.map((name) =>
      image(field(item, name), mediaBaseUrl),
    ).filter((example): example is NonNullable<typeof example> => example !== null)

    byFamily[family] = { image: main, examples }
  }

  return byFamily
}
