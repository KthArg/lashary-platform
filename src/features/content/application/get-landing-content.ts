import { err, ok, type Result } from '@/shared/result'
import type { CmsUnavailable } from '../domain/errors'
import {
  LANDING_CONTENT_KEYS,
  type CmsImage,
  type LandingContent,
} from '../domain/landing-content'
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

const field = (source: unknown, name: string): unknown =>
  typeof source === 'object' && source !== null
    ? (source as Record<string, unknown>)[name]
    : undefined

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed !== '' && trimmed.length <= max ? trimmed : null
}

// Los mismos destinos que acepta uno-cms en `s.link`; `//host` es externo y se rechaza.
const SAFE_LINK = /^(\/(?!\/)|#|\?|https?:\/\/|mailto:|tel:)/i
const link = (value: unknown): string | null => {
  const candidate = text(value, 2048)
  return candidate !== null && SAFE_LINK.test(candidate) ? candidate : null
}

const dimension = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined

function image(value: unknown, mediaBaseUrl: string): CmsImage | null {
  const url = text(field(value, 'url'), 2048)
  const alt = text(field(value, 'alt'), 500)
  if (url === null || alt === null) return null
  // En desarrollo uno-cms sirve rutas relativas (/api/media/local/…); en despliegue, absolutas.
  const resolved = url.startsWith('/') && !url.startsWith('//')
    ? `${mediaBaseUrl}${url}`
    : /^https:\/\//i.test(url) ? url : null
  if (resolved === null) return null
  const width = dimension(field(value, 'width'))
  const height = dimension(field(value, 'height'))
  return { url: resolved, alt, ...(width ? { width } : {}), ...(height ? { height } : {}) }
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
