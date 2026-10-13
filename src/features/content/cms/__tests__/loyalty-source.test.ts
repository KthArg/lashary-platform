import { describe, it, expect, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { CmsUnavailable } from '../../domain/errors'
import { EMPTY_LOYALTY } from '../../application/get-loyalty'
import type { CmsReader } from '../../application/ports'
import { LANDING_CACHE_SECONDS } from '../landing-source'
import { loadLoyalty, loyaltyCacheTags } from '../loyalty-source'

// unstable_cache real necesita el runtime de Next; aquí se sustituye por uno que ejecuta.
const passthroughCache = vi.fn((fn: () => Promise<unknown>) => fn) as never

const readerWith = (niveles: unknown[] | 'falla'): (() => CmsReader) => () => ({
  readSingleton: async () => ok({ texto: 'Cada cita suma una visita.' }),
  readCollection: async (key) =>
    niveles === 'falla' ? err(new CmsUnavailable(key, 'HTTP 503')) : ok(niveles),
})

describe('loadLoyalty — criterio 2: la mecánica sale del CMS, y su falla no tumba la landing', () => {
  it('sin CMS_URL devuelve el contenido vacío sin llamar al CMS', async () => {
    const createReader = vi.fn()
    expect(await loadLoyalty({ env: {}, cache: passthroughCache, createReader })).toEqual(EMPTY_LOYALTY)
    expect(createReader).not.toHaveBeenCalled()
  })

  it('si falla una de las dos lecturas devuelve el contenido vacío y no lanza', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const loyalty = await loadLoyalty({
      env: { CMS_URL: 'https://cms.test' },
      cache: passthroughCache,
      createReader: readerWith('falla') as never,
    })
    expect(loyalty).toEqual(EMPTY_LOYALTY)
  })

  it('con el CMS disponible sirve lo publicado, cacheado 10 min con los dos tags del aviso', async () => {
    const cache = vi.fn((fn: () => Promise<unknown>) => fn)
    const loyalty = await loadLoyalty({
      env: { CMS_URL: 'https://cms.test/' },
      cache: cache as never,
      createReader: readerWith([{ visita: 5, beneficio: '10 % de descuento' }]) as never,
    })

    expect(loyalty.paragraphs).toEqual(['Cada cita suma una visita.'])
    expect(loyalty.levels.map((level) => level.benefit)).toEqual(['10 % de descuento'])
    expect(cache).toHaveBeenCalledWith(expect.any(Function), ['content', 'fidelidad', 'https://cms.test'], {
      revalidate: LANDING_CACHE_SECONDS,
      tags: ['content:fidelidad', 'content:niveles-fidelidad'],
    })
    expect(loyaltyCacheTags).toEqual(['content:fidelidad', 'content:niveles-fidelidad'])
  })
})
