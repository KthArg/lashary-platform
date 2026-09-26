// Contenido de la landing tal como lo consume `landing` (docs/contracts/cms-api.md, v1).
// Ya validado y completado con el respaldo: quien lo recibe no ve nunca la forma cruda del CMS.

export const LANDING_CONTENT_KEYS = ['hero', 'intro', 'closingCta'] as const
export type LandingContentKey = (typeof LANDING_CONTENT_KEYS)[number]

// Clave de cada tipo en uno-cms, que solo admite minúsculas, dígitos y guiones: en la ruta y en
// los tags del aviso la llamada final es `closing-cta` (docs/contracts/cms-api.md).
export const CMS_CONTENT_KEYS: Record<LandingContentKey, string> = {
  hero: 'hero',
  intro: 'intro',
  closingCta: 'closing-cta',
}

export type CmsImage = {
  url: string
  alt: string
  width?: number
  height?: number
}

export type HeroContent = {
  titleLead: string
  titleEmphasis: string
  subtitle: string | null
  ctaLabel: string
  secondaryLabel: string | null
  secondaryHref: string | null
  image: CmsImage | null
}

export type IntroContent = {
  statement: string
  body: string | null
}

export type ClosingCtaContent = {
  heading: string
  headingEmphasis: string | null
  body: string | null
  ctaLabel: string
}

export type LandingContent = {
  hero: HeroContent
  intro: IntroContent
  closingCta: ClosingCtaContent
}
