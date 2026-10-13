import { describe, it, expect, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { CmsUnavailable } from '../../domain/errors'
import type { CmsReader } from '../../application/ports'
import { galleryCacheTag, loadGallery } from '../gallery-source'
import { LANDING_CACHE_SECONDS } from '../landing-source'

// unstable_cache real necesita el runtime de Next; aquí se sustituye por uno que ejecuta.
const passthroughCache = vi.fn((fn: () => Promise<unknown>) => fn) as never

const readerReturning = (items: unknown[] | 'falla'): (() => CmsReader) => () => ({
  readSingleton: async () => ok({}),
  readCollection: async (key) =>
    items === 'falla' ? err(new CmsUnavailable(key, 'HTTP 503')) : ok(items),
})

const parPublicado = {
  titulo: 'Volumen',
  familia: 'lash_volume',
  antes: { url: 'https://cdn.test/a.jpg', alt: 'Antes' },
  despues: { url: 'https://cdn.test/d.jpg', alt: 'Después' },
  consentimiento: true,
}

describe('loadGallery — criterio 2: los pares salen del CMS, y su falla no tumba la landing', () => {
  it('sin CMS_URL devuelve la galería vacía sin llamar al CMS', async () => {
    const createReader = vi.fn()
    expect(await loadGallery({ env: {}, cache: passthroughCache, createReader })).toEqual([])
    expect(createReader).not.toHaveBeenCalled()
  })

  it('con el CMS caído devuelve la galería vacía y no lanza', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const pairs = await loadGallery({
      env: { CMS_URL: 'https://cms.test' },
      cache: passthroughCache,
      createReader: readerReturning('falla') as never,
    })
    expect(pairs).toEqual([])
  })

  it('una lectura fallida rechaza dentro de la función cacheada, así que no se guarda', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    let cachedFn: (() => Promise<unknown>) | undefined
    const cache = ((fn: () => Promise<unknown>) => {
      cachedFn = fn
      return fn
    }) as never
    await loadGallery({
      env: { CMS_URL: 'https://cms.test' },
      cache,
      createReader: readerReturning('falla') as never,
    })
    await expect(cachedFn?.()).rejects.toBeInstanceOf(CmsUnavailable)
  })

  it('con el CMS disponible sirve los pares publicados, cacheados 10 min con el tag del aviso', async () => {
    const cache = vi.fn((fn: () => Promise<unknown>) => fn)
    const pairs = await loadGallery({
      env: { CMS_URL: 'https://cms.test/' },
      cache: cache as never,
      createReader: readerReturning([parPublicado]) as never,
    })

    expect(pairs.map((pair) => pair.after.alt)).toEqual(['Después'])
    expect(cache).toHaveBeenCalledWith(expect.any(Function), ['content', 'galeria', 'https://cms.test'], {
      revalidate: LANDING_CACHE_SECONDS,
      tags: [galleryCacheTag],
    })
    expect(galleryCacheTag).toBe('content:galeria')
  })
})
