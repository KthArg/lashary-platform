import { unstable_cache } from 'next/cache'
import { readRawTechniqueMedia, toTechniqueMedia } from '../application/get-technique-media'
import {
  TECHNIQUE_MEDIA_KEY,
  type TechniqueMediaByFamily,
} from '../domain/technique-media'
import { createCmsReader } from './cms-reader'
import { LANDING_CACHE_SECONDS } from './landing-source'

// El mismo tag que manda el aviso de uno-cms para esta colección.
export const techniqueMediaCacheTag = `content:${TECHNIQUE_MEDIA_KEY}`

type TechniqueMediaDeps = {
  env?: Record<string, string | undefined>
  cache?: typeof unstable_cache
  createReader?: typeof createCmsReader
}

// Fotos de las técnicas, listas para renderizar. Nunca lanza: sin `CMS_URL`, con el CMS caído o
// con una respuesta que no encaja, devuelve el mapa vacío y las técnicas se muestran sin fotos.
export async function loadTechniqueMedia({
  env = process.env,
  cache = unstable_cache,
  createReader = createCmsReader,
}: TechniqueMediaDeps = {}): Promise<TechniqueMediaByFamily> {
  const baseUrl = env.CMS_URL?.trim().replace(/\/+$/, '') ?? ''
  if (baseUrl === '') return {}

  const reader = createReader({ baseUrl })
  // Lanzar dentro de la función cacheada es lo que evita guardar una lectura fallida.
  const readCached = cache(
    async () => {
      const result = await readRawTechniqueMedia(reader)
      if (!result.ok) throw result.error
      return result.value
    },
    ['content', TECHNIQUE_MEDIA_KEY, baseUrl],
    { revalidate: LANDING_CACHE_SECONDS, tags: [techniqueMediaCacheTag] },
  )

  try {
    return toTechniqueMedia(await readCached(), baseUrl)
  } catch (error) {
    console.warn('[content] fotos de las técnicas no disponibles; se muestran sin foto', error)
    return {}
  }
}
