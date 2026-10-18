import { unstable_cache } from 'next/cache'
import { readRawStudio, toStudioContent } from '../application/get-studio'
import { CREDENTIALS_KEY, REASONS_KEY, STUDIO_KEY, type StudioContent } from '../domain/studio'
import { createCmsReader } from './cms-reader'
import { LANDING_CACHE_SECONDS } from './landing-source'

export const studioCacheTags: readonly string[] = [STUDIO_KEY, CREDENTIALS_KEY, REASONS_KEY].map(
  (key) => `content:${key}`,
)

type StudioSourceDeps = {
  env?: Record<string, string | undefined>
  cache?: typeof unstable_cache
  createReader?: typeof createCmsReader
}

export async function loadStudio({
  env = process.env,
  cache = unstable_cache,
  createReader = createCmsReader,
}: StudioSourceDeps = {}): Promise<StudioContent> {
  const baseUrl = env.CMS_URL?.trim().replace(/\/+$/, '') ?? ''
  if (baseUrl === '') return toStudioContent(null, '')

  const reader = createReader({ baseUrl })
  const readCached = cache(
    async () => {
      const result = await readRawStudio(reader)
      if (!result.ok) throw new Error(result.error.message)
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
