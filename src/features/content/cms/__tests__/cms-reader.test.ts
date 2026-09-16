import { describe, it, expect, vi } from 'vitest'
import { createCmsReader } from '../cms-reader'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

describe('createCmsReader — GET {CMS_URL}/api/content/:key', () => {
  it('pide la clave en el servidor del CMS con ?v= y sin caché de fetch', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ key: 'hero', data: { titleLead: 'x' } }))
    const reader = createCmsReader({ baseUrl: 'https://cms.test/', fetchImpl, now: () => 1234 })

    const result = await reader.readSingleton('hero')

    expect(result).toEqual({ ok: true, value: { titleLead: 'x' } })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://cms.test/api/content/hero?v=1234')
    expect(init.cache).toBe('no-store')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('la llamada final se pide con su clave del CMS, closing-cta', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ key: 'closing-cta', data: { heading: 'x' } }))
    const reader = createCmsReader({ baseUrl: 'https://cms.test', fetchImpl, now: () => 7 })

    await reader.readSingleton('closingCta')

    const [url] = fetchImpl.mock.calls[0] as unknown as [string]
    expect(url).toBe('https://cms.test/api/content/closing-cta?v=7')
  })

  it.each([404, 500])('HTTP %i es CMS no disponible', async (status) => {
    const reader = createCmsReader({ baseUrl: 'https://cms.test', fetchImpl: async () => jsonResponse({ error: 'x' }, status) })
    const result = await reader.readSingleton('intro')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.reason).toBe(`HTTP ${status}`)
  })

  it('cuerpo sin data o JSON inválido es CMS no disponible', async () => {
    const sinData = createCmsReader({ baseUrl: 'https://cms.test', fetchImpl: async () => jsonResponse({ key: 'hero' }) })
    const noJson = createCmsReader({ baseUrl: 'https://cms.test', fetchImpl: async () => new Response('<html>') })
    expect((await sinData.readSingleton('hero')).ok).toBe(false)
    expect((await noJson.readSingleton('hero')).ok).toBe(false)
  })

  it('red caída es CMS no disponible, sin lanzar', async () => {
    const reader = createCmsReader({ baseUrl: 'https://cms.test', fetchImpl: async () => { throw new TypeError('fetch failed') } })
    const result = await reader.readSingleton('closingCta')
    expect(result.ok).toBe(false)
  })

  it('corta la petición al vencer el timeout', async () => {
    const hangs: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason))
      })
    const reader = createCmsReader({ baseUrl: 'https://cms.test', fetchImpl: hangs, timeoutMs: 20 })
    const result = await reader.readSingleton('hero')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.reason).toBe('TimeoutError')
  })
})
