import { unstable_cache } from 'next/cache'
import { EMPTY_LOYALTY, readRawLoyalty, toLoyaltyContent } from '../application/get-loyalty'
import { LOYALTY_KEY, LOYALTY_LEVELS_KEY, type LoyaltyContent } from '../domain/loyalty'
import { createCmsReader } from './cms-reader'
import { LANDING_CACHE_SECONDS } from './landing-source'

// Los mismos tags que manda el aviso de uno-cms: `content:<clave>`.
export const loyaltyCacheTags: readonly string[] = [LOYALTY_KEY, LOYALTY_LEVELS_KEY].map(
  (key) => `content:${key}`,
)

type LoyaltySourceDeps = {
  env?: Record<string, string | undefined>
  cache?: typeof unstable_cache
  createReader?: typeof createCmsReader
}

// La mecánica del programa de fidelidad, lista para renderizar. Nunca lanza: sin `CMS_URL`, con
// el CMS caído o con una respuesta que no encaja, devuelve el contenido vacío.
export async function loadLoyalty({
  env = process.env,
  cache = unstable_cache,
  createReader = createCmsReader,
}: LoyaltySourceDeps = {}): Promise<LoyaltyContent> {
  const baseUrl = env.CMS_URL?.trim().replace(/\/+$/, '') ?? ''
  if (baseUrl === '') return EMPTY_LOYALTY

  const reader = createReader({ baseUrl })
  // Lanzar dentro de la función cacheada es lo que evita guardar una lectura fallida.
  const readCached = cache(
    async () => {
      const result = await readRawLoyalty(reader)
      if (!result.ok) throw result.error
      return result.value
    },
    ['content', LOYALTY_KEY, baseUrl],
    { revalidate: LANDING_CACHE_SECONDS, tags: [...loyaltyCacheTags] },
  )

  try {
    return toLoyaltyContent(await readCached())
  } catch (error) {
    console.warn('[content] fidelidad no disponible; la sección queda vacía', error)
    return EMPTY_LOYALTY
  }
}
