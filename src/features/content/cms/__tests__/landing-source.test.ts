import { describe, it, expect, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { CmsUnavailable } from '../../domain/errors'
import { landingFallback } from '../../application/fallback-messages'
import type { CmsReader } from '../../application/ports'
import { LANDING_CACHE_SECONDS, loadLandingContent } from '../landing-source'

// unstable_cache real necesita el runtime de Next; aquí se sustituye por uno que ejecuta y
// registra con qué se configuró.
const passthroughCache = vi.fn((fn: () => Promise<unknown>) => fn) as never

const readerReturning = (data: Record<string, unknown> | 'falla'): (() => CmsReader) => () => ({
  readSingleton: async (key) =>
    data === 'falla' ? err(new CmsUnavailable(key, 'HTTP 503')) : ok(data[key]),
  // La landing no lee colecciones por esta vía; el doble cumple el puerto y nada más.
  readCollection: async () => ok([] as unknown[]),
})

describe('loadLandingContent — degradación (docs/contracts/cms-api.md)', () => {
  it('sin CMS_URL sirve el respaldo sin llamar al CMS', async () => {
    const createReader = vi.fn()
    const content = await loadLandingContent({ env: {}, cache: passthroughCache, createReader })
    expect(content).toEqual(landingFallback)
    expect(createReader).not.toHaveBeenCalled()
  })

  it('con el CMS caído sirve el respaldo y no lanza', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const content = await loadLandingContent({
      env: { CMS_URL: 'https://cms.test' },
      cache: passthroughCache,
      createReader: readerReturning('falla') as never,
    })
    expect(content).toEqual(landingFallback)
  })

  it('una lectura fallida rechaza dentro de la función cacheada, así que no se guarda', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let cachedFn: (() => Promise<unknown>) | undefined
    const cache = ((fn: () => Promise<unknown>) => {
      cachedFn = fn
      return fn
    }) as never
    await loadLandingContent({
      env: { CMS_URL: 'https://cms.test' },
      cache,
      createReader: readerReturning('falla') as never,
    })
    await expect(cachedFn?.()).rejects.toBeInstanceOf(CmsUnavailable)
  })

  it('con el CMS disponible sirve lo publicado, cacheado 10 min con los tags del aviso', async () => {
    const cache = vi.fn((fn: () => Promise<unknown>) => fn)
    const content = await loadLandingContent({
      env: { CMS_URL: 'https://cms.test/' },
      cache: cache as never,
      createReader: readerReturning({
        hero: { titleLead: 'desde el CMS', titleEmphasis: 'sí.', ctaLabel: 'Reservar cita' },
        intro: { statement: 'Frase publicada.' },
        closingCta: { heading: 'Cierre publicado', ctaLabel: 'Reservar cita' },
      }) as never,
    })
    expect(content.hero.titleLead).toBe('desde el CMS')
    expect(content.intro.statement).toBe('Frase publicada.')
    expect(content.closingCta.heading).toBe('Cierre publicado')
    expect(cache).toHaveBeenCalledWith(expect.any(Function), ['content', 'landing', 'https://cms.test'], {
      revalidate: LANDING_CACHE_SECONDS,
      tags: ['content:hero', 'content:intro', 'content:closing-cta'],
    })
  })
})
