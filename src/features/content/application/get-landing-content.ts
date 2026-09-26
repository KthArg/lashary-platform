import { err, ok, type Result } from '@/shared/result'
import type { CmsUnavailable } from '../domain/errors'
import { LANDING_CONTENT_KEYS, type LandingContent } from '../domain/landing-content'
import { field, image, link, text } from './cms-values'
import { landingFallback } from './fallback-messages'
import type { CmsReader, RawLandingContent } from './ports'

// Lee los tipos vigentes en paralelo. Si uno falla, falla la lectura entera: así una respuesta a
// medias nunca llega a la caché (docs/contracts/cms-api.md § Invalidación).
export async function readRawLandingContent(
  reader: CmsReader,
): Promise<Result<RawLandingContent, CmsUnavailable>> {
  const results = await Promise.all(LANDING_CONTENT_KEYS.map((key) => reader.readSingleton(key)))
  const raw = {} as RawLandingContent
  for (const [index, key] of LANDING_CONTENT_KEYS.entries()) {
    const result = results[index]
    if (!result.ok) return err(result.error)
    raw[key] = result.value
  }
  return ok(raw)
}

// Un tipo cuyos requeridos llegan todos vacíos nunca se publicó: se usa su respaldo completo.
const published = (source: unknown, required: string[]): boolean =>
  required.some((name) => text(field(source, name), Number.POSITIVE_INFINITY) !== null)

// Valida la forma cruda contra el contrato y completa con el respaldo. Un requerido inválido o
// vacío toma el respaldo de ese campo; un opcional vacío queda en null. Con `raw` null (CMS no
// disponible o sin configurar) devuelve el respaldo entero. Nunca lanza.
export function toLandingContent(
  raw: RawLandingContent | null,
  mediaBaseUrl: string,
): LandingContent {
  if (raw === null) return landingFallback
  const { hero, intro, closingCta } = raw
  const fallback = landingFallback

  return {
    hero: published(hero, ['titleLead', 'titleEmphasis'])
      ? {
          titleLead: text(field(hero, 'titleLead'), 60) ?? fallback.hero.titleLead,
          titleEmphasis: text(field(hero, 'titleEmphasis'), 40) ?? fallback.hero.titleEmphasis,
          subtitle: text(field(hero, 'subtitle'), 200),
          ctaLabel: text(field(hero, 'ctaLabel'), 30) ?? fallback.hero.ctaLabel,
          secondaryLabel: text(field(hero, 'secondaryLabel'), 40),
          secondaryHref: link(field(hero, 'secondaryHref')),
          image: image(field(hero, 'image'), mediaBaseUrl),
        }
      : fallback.hero,
    intro: published(intro, ['statement'])
      ? {
          statement: text(field(intro, 'statement'), 160) ?? fallback.intro.statement,
          body: text(field(intro, 'body'), 400),
        }
      : fallback.intro,
    closingCta: published(closingCta, ['heading'])
      ? {
          heading: text(field(closingCta, 'heading'), 80) ?? fallback.closingCta.heading,
          headingEmphasis: text(field(closingCta, 'headingEmphasis'), 30),
          body: text(field(closingCta, 'body'), 240),
          ctaLabel: text(field(closingCta, 'ctaLabel'), 30) ?? fallback.closingCta.ctaLabel,
        }
      : fallback.closingCta,
  }
}
