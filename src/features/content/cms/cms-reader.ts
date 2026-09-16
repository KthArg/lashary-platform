import { err, ok } from '@/shared/result'
import { CmsUnavailable } from '../domain/errors'
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

  return {
    async readSingleton(key) {
      let response: Response
      try {
        response = await fetchImpl(`${origin}/api/content/${key}?v=${now()}`, {
          cache: 'no-store',
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(timeoutMs),
        })
      } catch (error) {
        return err(new CmsUnavailable(key, error instanceof Error ? error.name : 'fetch fallido'))
      }

      if (!response.ok) return err(new CmsUnavailable(key, `HTTP ${response.status}`))

      let body: unknown
      try {
        body = await response.json()
      } catch {
        return err(new CmsUnavailable(key, 'JSON inválido'))
      }

      if (typeof body !== 'object' || body === null || !('data' in body)) {
        return err(new CmsUnavailable(key, 'respuesta sin data'))
      }
      return ok((body as { data: unknown }).data)
    },
  }
}
