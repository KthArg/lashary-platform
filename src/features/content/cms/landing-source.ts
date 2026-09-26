import { unstable_cache } from 'next/cache'
import { CMS_CONTENT_KEYS, LANDING_CONTENT_KEYS, type LandingContent } from '../domain/landing-content'
import { readRawLandingContent, toLandingContent } from '../application/get-landing-content'
import { createCmsReader } from './cms-reader'

// TTL de respaldo (docs/contracts/cms-api.md § Invalidación): cota un aviso perdido.
export const LANDING_CACHE_SECONDS = 600

// Los mismos tags que manda el aviso de uno-cms: `content:<clave>`.
export const landingCacheTags: readonly string[] = LANDING_CONTENT_KEYS.map(
  (key) => `content:${CMS_CONTENT_KEYS[key]}`,
)

type LandingSourceDeps = {
  env?: Record<string, string | undefined>
  cache?: typeof unstable_cache
  createReader?: typeof createCmsReader
}

// Contenido de la landing, listo para renderizar. Nunca lanza: sin CMS_URL, con el CMS caído o
// con una respuesta que no encaja, devuelve el respaldo (§ Degradación).
export async function loadLandingContent({
  env = process.env,
  cache = unstable_cache,
  createReader = createCmsReader,
}: LandingSourceDeps = {}): Promise<LandingContent> {
  const baseUrl = env.CMS_URL?.trim().replace(/\/+$/, '') ?? ''
  if (baseUrl === '') {
    console.warn('[content] CMS_URL sin definir: se sirve el contenido de respaldo')
    return toLandingContent(null, '')
  }

  const reader = createReader({ baseUrl })
  // Lanzar dentro de la función cacheada es lo que evita guardar una lectura fallida.
  const readCached = cache(
    async () => {
      const result = await readRawLandingContent(reader)
      if (!result.ok) throw result.error
      return result.value
    },
    ['content', 'landing', baseUrl],
    { revalidate: LANDING_CACHE_SECONDS, tags: [...landingCacheTags] },
  )

  try {
    return toLandingContent(await readCached(), baseUrl)
  } catch (error) {
    console.error('[content] lectura del CMS fallida; se sirve el respaldo', error)
    return toLandingContent(null, baseUrl)
  }
}
