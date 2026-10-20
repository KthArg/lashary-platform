import { unstable_cache } from 'next/cache'
import { readRawContact, toContactContent } from '../application/get-contact'
import { CONTACT_KEY, FAQ_KEY, HOURS_KEY, type ContactContent } from '../domain/contact'
import { createCmsReader } from './cms-reader'
import { LANDING_CACHE_SECONDS } from './landing-source'

export const contactCacheTags: readonly string[] = [CONTACT_KEY, HOURS_KEY, FAQ_KEY].map(
  (key) => `content:${key}`,
)

type ContactSourceDeps = {
  env?: Record<string, string | undefined>
  cache?: typeof unstable_cache
  createReader?: typeof createCmsReader
}

export async function loadContact({
  env = process.env,
  cache = unstable_cache,
  createReader = createCmsReader,
}: ContactSourceDeps = {}): Promise<ContactContent> {
  const baseUrl = env.CMS_URL?.trim().replace(/\/+$/, '') ?? ''
  if (baseUrl === '') return toContactContent(null)

  const reader = createReader({ baseUrl })
  const readCached = cache(
    async () => {
      const result = await readRawContact(reader)
      if (!result.ok) throw new Error(result.error.message)
      return result.value
    },
    ['content', CONTACT_KEY, baseUrl],
    { revalidate: LANDING_CACHE_SECONDS, tags: [...contactCacheTags] },
  )

  try {
    return toContactContent(await readCached())
  } catch (error) {
    console.warn('[content] contacto no disponible; se muestra sin contacto ni horario', error)
    return toContactContent(null)
  }
}
