import { unstable_cache } from 'next/cache'
import { EMPTY_LOYALTY, readRawLoyalty, toLoyaltyContent } from '../application/get-loyalty'
import { LOYALTY_KEY, LOYALTY_LEVELS_KEY, type LoyaltyContent } from '../domain/loyalty'
import { createCmsReader } from './cms-reader'
import { LANDING_CACHE_SECONDS } from './landing-source'

export const loyaltyCacheTags: readonly string[] = [LOYALTY_KEY, LOYALTY_LEVELS_KEY].map(
  (key) => `content:${key}`,
)

type LoyaltySourceDeps = {
  env?: Record<string, string | undefined>
  cache?: typeof unstable_cache
  createReader?: typeof createCmsReader
}

export async function loadLoyalty({
  env = process.env,
  cache = unstable_cache,
  createReader = createCmsReader,
}: LoyaltySourceDeps = {}): Promise<LoyaltyContent> {
  const baseUrl = env.CMS_URL?.trim().replace(/\/+$/, '') ?? ''
  if (baseUrl === '') return EMPTY_LOYALTY

  const reader = createReader({ baseUrl })
  const readCached = cache(
    async () => {
      const result = await readRawLoyalty(reader)
      if (!result.ok) throw new Error(result.error.message)
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
