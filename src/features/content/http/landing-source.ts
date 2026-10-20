import { unstable_cache } from 'next/cache'
import { CMS_CONTENT_KEYS, LANDING_CONTENT_KEYS, type LandingContent } from '../domain/landing-content'
import { readRawLandingContent, toLandingContent } from '../application/get-landing-content'
import { createCmsReader } from './cms-reader'

export const LANDING_CACHE_SECONDS = 600

export const landingCacheTags: readonly string[] = LANDING_CONTENT_KEYS.map(
  (key) => `content:${CMS_CONTENT_KEYS[key]}`,
)

type LandingSourceDeps = {
  env?: Record<string, string | undefined>
  cache?: typeof unstable_cache
  createReader?: typeof createCmsReader
}

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
  const readCached = cache(
    async () => {
      const result = await readRawLandingContent(reader)
      if (!result.ok) throw new Error(result.error.message)
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
