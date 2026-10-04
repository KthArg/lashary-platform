import { describe, it, expect, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { CmsUnavailable } from '../../domain/errors'
import { studioFallback } from '../../application/fallback-messages'
import type { CmsReader } from '../../application/ports'
import { LANDING_CACHE_SECONDS } from '../landing-source'
import { loadStudio, studioCacheTags } from '../studio-source'

// unstable_cache real necesita el runtime de Next; aquí se sustituye por uno que ejecuta.
const passthroughCache = vi.fn((fn: () => Promise<unknown>) => fn) as never

const readerWith = (credenciales: unknown[] | 'falla'): (() => CmsReader) => () => ({
  readSingleton: async () =>
    ok({ nombre: 'Ana', texto: 'Hola.', retrato: { url: 'https://cdn.test/a.jpg', alt: 'Ana' } }),
  readCollection: async (key) =>
    key === 'credenciales' && credenciales === 'falla'
      ? err(new CmsUnavailable(key, 'HTTP 503'))
      : ok(key === 'credenciales' ? (credenciales as unknown[]) : []),
})

describe('loadStudio — criterio 3: El estudio sale del CMS, y su falla no tumba la landing', () => {
  it('sin CMS_URL sirve el respaldo sin llamar al CMS', async () => {
    const createReader = vi.fn()
    expect(await loadStudio({ env: {}, cache: passthroughCache, createReader })).toEqual(studioFallback)
    expect(createReader).not.toHaveBeenCalled()
  })

  it('si falla una de las tres lecturas sirve el respaldo entero y no lanza', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const studio = await loadStudio({
      env: { CMS_URL: 'https://cms.test' },
      cache: passthroughCache,
      createReader: readerWith('falla') as never,
    })
    expect(studio).toEqual(studioFallback)
  })

  it('con el CMS disponible sirve lo publicado, cacheado 10 min con los tres tags del aviso', async () => {
    const cache = vi.fn((fn: () => Promise<unknown>) => fn)
    const studio = await loadStudio({
      env: { CMS_URL: 'https://cms.test/' },
      cache: cache as never,
      createReader: readerWith([{ titulo: 'Volumen ruso', tipo: 'certificacion' }]) as never,
    })

    expect(studio.profile.name).toBe('Ana')
    expect(studio.credentials.map((credential) => credential.title)).toEqual(['Volumen ruso'])
    expect(cache).toHaveBeenCalledWith(expect.any(Function), ['content', 'estudio', 'https://cms.test'], {
      revalidate: LANDING_CACHE_SECONDS,
      tags: ['content:estudio', 'content:credenciales', 'content:razones'],
    })
    expect(studioCacheTags).toEqual(['content:estudio', 'content:credenciales', 'content:razones'])
  })
})
