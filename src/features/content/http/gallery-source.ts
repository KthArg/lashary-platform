import { unstable_cache } from 'next/cache'
import { readRawGallery, toGallery } from '../application/get-gallery'
import { GALLERY_KEY, type GalleryPair } from '../domain/gallery'
import { createCmsReader } from './cms-reader'
import { LANDING_CACHE_SECONDS } from './landing-source'

export const galleryCacheTag = `content:${GALLERY_KEY}`

type GallerySourceDeps = {
  env?: Record<string, string | undefined>
  cache?: typeof unstable_cache
  createReader?: typeof createCmsReader
}

export async function loadGallery({
  env = process.env,
  cache = unstable_cache,
  createReader = createCmsReader,
}: GallerySourceDeps = {}): Promise<GalleryPair[]> {
  const baseUrl = env.CMS_URL?.trim().replace(/\/+$/, '') ?? ''
  if (baseUrl === '') return []

  const reader = createReader({ baseUrl })
  const readCached = cache(
    async () => {
      const result = await readRawGallery(reader)
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
    ['content', GALLERY_KEY, baseUrl],
    { revalidate: LANDING_CACHE_SECONDS, tags: [galleryCacheTag] },
  )

  try {
    return toGallery(await readCached(), baseUrl)
  } catch (error) {
    console.warn('[content] galería no disponible; se muestra vacía', error)
    return []
  }
}
