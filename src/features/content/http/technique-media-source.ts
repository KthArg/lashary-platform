import { unstable_cache } from 'next/cache'
import { readRawTechniqueMedia, toTechniqueMedia } from '../application/get-technique-media'
import {
  TECHNIQUE_MEDIA_KEY,
  type TechniqueMediaByFamily,
} from '../domain/technique-media'
import { createCmsReader } from './cms-reader'
import { LANDING_CACHE_SECONDS } from './landing-source'

export const techniqueMediaCacheTag = `content:${TECHNIQUE_MEDIA_KEY}`

type TechniqueMediaDeps = {
  env?: Record<string, string | undefined>
  cache?: typeof unstable_cache
  createReader?: typeof createCmsReader
}

export async function loadTechniqueMedia({
  env = process.env,
  cache = unstable_cache,
  createReader = createCmsReader,
}: TechniqueMediaDeps = {}): Promise<TechniqueMediaByFamily> {
  const baseUrl = env.CMS_URL?.trim().replace(/\/+$/, '') ?? ''
  if (baseUrl === '') return {}

  const reader = createReader({ baseUrl })
  const readCached = cache(
    async () => {
      const result = await readRawTechniqueMedia(reader)
      if (!result.ok) throw new Error(result.error.message)
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
