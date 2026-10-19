import { err, ok } from '@/shared/result'
import { cmsUnavailable } from '../domain/errors'
import { CMS_CONTENT_KEYS, type LandingContentKey } from '../domain/landing-content'
import type { CmsReader } from '../application/ports'

type CmsReaderOptions = {
  baseUrl: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  now?: () => number
}

export function createCmsReader({
  baseUrl,
  fetchImpl = fetch,
  timeoutMs = 3000,
  now = Date.now,
}: CmsReaderOptions): CmsReader {
  const origin = baseUrl.replace(/\/+$/, '')

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
        cmsUnavailable(reportedKey, error instanceof Error ? error.name : 'fetch fallido'),
      )
    }

    if (!response.ok) return err(cmsUnavailable(reportedKey, `HTTP ${response.status}`))

    try {
      return ok((await response.json()) as unknown)
    } catch {
      return err(cmsUnavailable(reportedKey, 'JSON inválido'))
    }
  }

  return {
    async readSingleton(key) {
      const cmsKey = key in CMS_CONTENT_KEYS ? CMS_CONTENT_KEYS[key as LandingContentKey] : key
      const body = await read(cmsKey, key)
      if (!body.ok) return body

      if (typeof body.value !== 'object' || body.value === null || !('data' in body.value)) {
        return err(cmsUnavailable(key, 'respuesta sin data'))
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
      if (!Array.isArray(items)) return err(cmsUnavailable(key, 'respuesta sin items'))
      return ok(items)
    },
  }
}
