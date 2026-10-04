import { unstable_cache } from 'next/cache'
import { readRawStudio, toStudioContent } from '../application/get-studio'
import { CREDENTIALS_KEY, REASONS_KEY, STUDIO_KEY, type StudioContent } from '../domain/studio'
import { createCmsReader } from './cms-reader'
import { LANDING_CACHE_SECONDS } from './landing-source'

// Los mismos tags que manda el aviso de uno-cms: `content:<clave>`.
export const studioCacheTags: readonly string[] = [STUDIO_KEY, CREDENTIALS_KEY, REASONS_KEY].map(
  (key) => `content:${key}`,
)

type StudioSourceDeps = {
  env?: Record<string, string | undefined>
  cache?: typeof unstable_cache
  createReader?: typeof createCmsReader
}

// El estudio y Por qué acá, listos para renderizar. Nunca lanza: sin `CMS_URL`, con el CMS
// caído o con una respuesta que no encaja, devuelve el respaldo (§ Degradación).
export async function loadStudio({
  env = process.env,
  cache = unstable_cache,
  createReader = createCmsReader,
}: StudioSourceDeps = {}): Promise<StudioContent> {
  const baseUrl = env.CMS_URL?.trim().replace(/\/+$/, '') ?? ''
  if (baseUrl === '') return toStudioContent(null, '')

  const reader = createReader({ baseUrl })
  // Lanzar dentro de la función cacheada es lo que evita guardar una lectura fallida.
  const readCached = cache(
    async () => {
      const result = await readRawStudio(reader)
      if (!result.ok) throw result.error
      return result.value
    },
    ['content', STUDIO_KEY, baseUrl],
    { revalidate: LANDING_CACHE_SECONDS, tags: [...studioCacheTags] },
  )

  try {
    return toStudioContent(await readCached(), baseUrl)
  } catch (error) {
    console.warn('[content] El estudio no disponible; se sirve el respaldo', error)
    return toStudioContent(null, baseUrl)
  }
}
