import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { CmsUnavailable } from '../../domain/errors'
import { landingFallback } from '../fallback-messages'
import { readRawLandingContent, toLandingContent } from '../get-landing-content'
import type { CmsReader, RawLandingContent } from '../ports'

const BASE = 'https://cms.lashary.test'

const published: RawLandingContent = {
  hero: {
    titleLead: 'pestañas a mano',
    titleEmphasis: 'con calma.',
    subtitle: 'Cabina propia.',
    ctaLabel: 'Agendar',
    secondaryLabel: 'Ver Instagram',
    secondaryHref: 'https://instagram.com/lashary',
    image: { mediaId: 'm1', url: 'https://blob.test/ojo.webp', alt: 'Ojo con extensiones', width: 1600, height: 900 },
  },
  intro: { statement: 'Tiempo, luz y criterio.', body: 'Reviso tu pestaña primero.' },
  closingCta: { heading: 'Una clienta', headingEmphasis: 'a la vez', body: 'Elegís día y hora.', ctaLabel: 'Reservar' },
}

describe('toLandingContent — US-LAND-01 criterio 3: contenido editable desde el CMS', () => {
  it('muestra lo publicado en hero, intro y closingCta', () => {
    const content = toLandingContent(published, BASE)
    expect(content.hero).toEqual({
      titleLead: 'pestañas a mano',
      titleEmphasis: 'con calma.',
      subtitle: 'Cabina propia.',
      ctaLabel: 'Agendar',
      secondaryLabel: 'Ver Instagram',
      secondaryHref: 'https://instagram.com/lashary',
      image: { url: 'https://blob.test/ojo.webp', alt: 'Ojo con extensiones', width: 1600, height: 900 },
    })
    expect(content.intro).toEqual({ statement: 'Tiempo, luz y criterio.', body: 'Reviso tu pestaña primero.' })
    expect(content.closingCta).toEqual({
      heading: 'Una clienta',
      headingEmphasis: 'a la vez',
      body: 'Elegís día y hora.',
      ctaLabel: 'Reservar',
    })
  })

  it('sin CMS (raw null) devuelve el respaldo entero', () => {
    expect(toLandingContent(null, BASE)).toEqual(landingFallback)
  })

  it('un tipo nunca publicado (requeridos vacíos) usa su respaldo completo', () => {
    const neverPublished = { ...published, hero: { titleLead: '', titleEmphasis: '', ctaLabel: 'Reservar cita', image: { mediaId: '', url: '', alt: '' } } }
    expect(toLandingContent(neverPublished, BASE).hero).toEqual(landingFallback.hero)
  })

  it('un requerido inválido toma el respaldo de ese campo y conserva el resto', () => {
    const broken = { ...published, hero: { ...(published.hero as object), titleEmphasis: 42 } }
    const hero = toLandingContent(broken, BASE).hero
    expect(hero.titleEmphasis).toBe(landingFallback.hero.titleEmphasis)
    expect(hero.titleLead).toBe('pestañas a mano')
  })

  it('un requerido más largo que su máximo del contrato toma el respaldo', () => {
    const tooLong = { ...published, intro: { statement: 'x'.repeat(161) } }
    expect(toLandingContent(tooLong, BASE).intro.statement).toBe(landingFallback.intro.statement)
  })

  it('un opcional ausente o vacío queda en null', () => {
    const sparse = { ...published, closingCta: { heading: 'Una clienta', body: '   ', ctaLabel: 'Reservar' } }
    const closing = toLandingContent(sparse, BASE).closingCta
    expect(closing.headingEmphasis).toBeNull()
    expect(closing.body).toBeNull()
  })

  it('rechaza enlaces no permitidos', () => {
    for (const href of ['javascript:alert(1)', '//evil.test', 'data:text/html,x']) {
      const hero = toLandingContent({ ...published, hero: { ...(published.hero as object), secondaryHref: href } }, BASE).hero
      expect(hero.secondaryHref).toBeNull()
    }
  })

  it('imagen sin url o sin alt no se renderiza; ruta relativa se resuelve contra CMS_URL', () => {
    const withImage = (image: unknown) =>
      toLandingContent({ ...published, hero: { ...(published.hero as object), image } }, BASE).hero.image
    expect(withImage({ mediaId: '', url: '', alt: 'x' })).toBeNull()
    expect(withImage({ mediaId: 'm', url: 'https://blob.test/a.webp', alt: '' })).toBeNull()
    expect(withImage({ mediaId: 'm', url: 'http://blob.test/a.webp', alt: 'a' })).toBeNull()
    expect(withImage({ mediaId: 'm', url: '/api/media/local/a.webp', alt: 'a' })).toEqual({
      url: `${BASE}/api/media/local/a.webp`,
      alt: 'a',
    })
  })
})

describe('readRawLandingContent — una lectura a medias no se acepta', () => {
  const readerWith = (failing?: string): CmsReader => ({
    readSingleton: async (key) =>
      key === failing ? err(new CmsUnavailable(key, 'HTTP 500')) : ok({ key }),
  })

  it('con todos los tipos disponibles devuelve el mapa crudo', async () => {
    const result = await readRawLandingContent(readerWith())
    expect(result).toEqual(ok({ hero: { key: 'hero' }, intro: { key: 'intro' }, closingCta: { key: 'closingCta' } }))
  })

  it('si un tipo falla, falla la lectura entera', async () => {
    const result = await readRawLandingContent(readerWith('intro'))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.key).toBe('intro')
  })
})
