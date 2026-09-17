import { err, ok } from '@/shared/result'
import { CmsUnavailable } from '../domain/errors'
import { CMS_CONTENT_KEYS } from '../domain/landing-content'
import type { CmsReader } from '../application/ports'

type CmsReaderOptions = {
  baseUrl: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  now?: () => number
}

// Adaptador HTTP de GET {CMS_URL}/api/content/:key (docs/contracts/cms-api.md § Transporte).
// Solo servidor: la ruta del CMS no manda CORS. `?v=` salta la copia de 60 s de la CDN del CMS;
// la frecuencia de lectura la decide la caché de landing-source.ts.
export function createCmsReader({
  baseUrl,
  fetchImpl = fetch,
  timeoutMs = 3000,
  now = Date.now,
}: CmsReaderOptions): CmsReader {
  const origin = baseUrl.replace(/\/+$/, '')

  // Una sola petición para los dos tipos de lectura: cambia solo qué campo se espera en el
  // cuerpo (`data` para un singleton, `items` para una colección).
  async function read(cmsKey: string, reportedKey: string) {
    let response: Response
    try {
      response = await fetchImpl(`${origin}/api/content/${cmsKey}?v=${now()}`, {
        cache: 'no-store',
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      })
    } catch (error) {
      return err(
        new CmsUnavailable(reportedKey, error instanceof Error ? error.name : 'fetch fallido'),
      )
    }

    if (!response.ok) return err(new CmsUnavailable(reportedKey, `HTTP ${response.status}`))

    try {
      return ok((await response.json()) as unknown)
    } catch {
      return err(new CmsUnavailable(reportedKey, 'JSON inválido'))
    }
  }

  return {
    async readSingleton(key) {
      const body = await read(CMS_CONTENT_KEYS[key], key)
      if (!body.ok) return body

      if (typeof body.value !== 'object' || body.value === null || !('data' in body.value)) {
        return err(new CmsUnavailable(key, 'respuesta sin data'))
      }
      return ok((body.value as { data: unknown }).data)
    },

    async readCollection(key) {
      const body = await read(key, key)
      if (!body.ok) return body

      const items =
        typeof body.value === 'object' && body.value !== null
          ? (body.value as { items?: unknown }).items
          : undefined
      if (!Array.isArray(items)) return err(new CmsUnavailable(key, 'respuesta sin items'))
      return ok(items)
    },
  }
}
