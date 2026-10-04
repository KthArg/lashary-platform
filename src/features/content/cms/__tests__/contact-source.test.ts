import { describe, it, expect, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { CmsUnavailable } from '../../domain/errors'
import { faqFallback } from '../../application/fallback-messages'
import type { CmsReader } from '../../application/ports'
import { contactCacheTags, loadContact } from '../contact-source'
import { LANDING_CACHE_SECONDS } from '../landing-source'

// unstable_cache real necesita el runtime de Next; aquí se sustituye por uno que ejecuta.
const passthroughCache = vi.fn((fn: () => Promise<unknown>) => fn) as never

const readerWith = (horarios: unknown[] | 'falla'): (() => CmsReader) => () => ({
  readSingleton: async () =>
    ok({ direccion: 'Frente al parque', whatsapp: '50688887777', instagram: 'https://instagram.com/x' }),
  readCollection: async (key) =>
    key === 'horarios' && horarios === 'falla'
      ? err(new CmsUnavailable(key, 'HTTP 503'))
      : ok(key === 'horarios' ? (horarios as unknown[]) : []),
})

const sinCms = { contact: null, hours: [], faqs: faqFallback }

describe('loadContact — criterio 4: todo el contacto sale del CMS, y su falla no tumba la landing', () => {
  it('sin CMS_URL no hay contacto ni horario, y las preguntas son las del diseño', async () => {
    const createReader = vi.fn()
    expect(await loadContact({ env: {}, cache: passthroughCache, createReader })).toEqual(sinCms)
    expect(createReader).not.toHaveBeenCalled()
  })

  it('si falla una de las tres lecturas sirve lo mismo que sin CMS, y no lanza', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const contact = await loadContact({
      env: { CMS_URL: 'https://cms.test' },
      cache: passthroughCache,
      createReader: readerWith('falla') as never,
    })
    expect(contact).toEqual(sinCms)
  })

  it('con el CMS disponible sirve lo publicado, cacheado 10 min con los tres tags del aviso', async () => {
    const cache = vi.fn((fn: () => Promise<unknown>) => fn)
    const contact = await loadContact({
      env: { CMS_URL: 'https://cms.test/' },
      cache: cache as never,
      createReader: readerWith([{ dias: 'Sábado', horas: '9:00 a 14:00' }]) as never,
    })

    expect(contact.contact?.address).toBe('Frente al parque')
    expect(contact.hours).toEqual([{ days: 'Sábado', hours: '9:00 a 14:00' }])
    expect(cache).toHaveBeenCalledWith(expect.any(Function), ['content', 'contacto', 'https://cms.test'], {
      revalidate: LANDING_CACHE_SECONDS,
      tags: ['content:contacto', 'content:horarios', 'content:preguntas'],
    })
    expect(contactCacheTags).toEqual(['content:contacto', 'content:horarios', 'content:preguntas'])
  })
})
