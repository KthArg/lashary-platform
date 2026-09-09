// Contenido de la sección de inicio del sitio público, tal como lo entrega el CMS externo
// (ADR-0001). Contrato: docs/contracts/cms-api.md § "Sección inicio" (esquema ASUMIDO).
// El precio y la duración de técnicas NUNCA viven aquí: vienen del catálogo (US-AGE-08).

export interface HomeHeroImage {
  /** URL servible del CMS (HTTPS, con caché). */
  url: string
  /** Texto alternativo significativo (UI-004). `''` solo si el CMS la marca decorativa. */
  alt: string
}

export interface HomeContent {
  heroImage: HomeHeroImage
  /** Texto de bienvenida (una o dos frases). */
  welcomeText: string
  /** Etiqueta del llamado a la acción para agendar. */
  ctaLabel: string
}

const isFilledString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

/**
 * Parsea la respuesta cruda del CMS a `HomeContent`. Defensivo por diseño (DOM-007, borde):
 * cualquier forma inesperada devuelve `null` y quien llama degrada con gracia (ADR-0001).
 */
export function parseHomeContent(raw: unknown): HomeContent | null {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>

  const image = record.heroImage
  if (typeof image !== 'object' || image === null) return null
  const imageRecord = image as Record<string, unknown>

  if (!isFilledString(imageRecord.url)) return null
  if (typeof imageRecord.alt !== 'string') return null
  if (!isFilledString(record.welcomeText)) return null
  if (!isFilledString(record.ctaLabel)) return null

  return {
    heroImage: { url: imageRecord.url, alt: imageRecord.alt },
    welcomeText: record.welcomeText,
    ctaLabel: record.ctaLabel,
  }
}
