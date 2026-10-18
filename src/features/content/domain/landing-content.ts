export const LANDING_CONTENT_KEYS = ['hero', 'intro', 'closingCta'] as const
export type LandingContentKey = (typeof LANDING_CONTENT_KEYS)[number]

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
