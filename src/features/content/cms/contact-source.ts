import { unstable_cache } from 'next/cache'
import { readRawContact, toContactContent } from '../application/get-contact'
import { CONTACT_KEY, FAQ_KEY, HOURS_KEY, type ContactContent } from '../domain/contact'
import { createCmsReader } from './cms-reader'
import { LANDING_CACHE_SECONDS } from './landing-source'

// Los mismos tags que manda el aviso de uno-cms: `content:<clave>`.
export const contactCacheTags: readonly string[] = [CONTACT_KEY, HOURS_KEY, FAQ_KEY].map(
  (key) => `content:${key}`,
)

type ContactSourceDeps = {
  env?: Record<string, string | undefined>
  cache?: typeof unstable_cache
  createReader?: typeof createCmsReader
}

// Contacto, horario y preguntas, listos para renderizar. Nunca lanza: sin `CMS_URL`, con el CMS
// caído o con una respuesta que no encaja, sirve lo que el contrato permite sin CMS: sin contacto,
// sin horario y las preguntas del diseño.
export async function loadContact({
  env = process.env,
  cache = unstable_cache,
  createReader = createCmsReader,
}: ContactSourceDeps = {}): Promise<ContactContent> {
  const baseUrl = env.CMS_URL?.trim().replace(/\/+$/, '') ?? ''
  if (baseUrl === '') return toContactContent(null)

  const reader = createReader({ baseUrl })
  // Lanzar dentro de la función cacheada es lo que evita guardar una lectura fallida.
  const readCached = cache(
    async () => {
      const result = await readRawContact(reader)
      if (!result.ok) throw result.error
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
