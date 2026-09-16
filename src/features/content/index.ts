// Entry point público de la feature content (ARCH-003). Solo servidor: lee el CMS externo
// (uno-cms) según docs/contracts/cms-api.md.

export { loadLandingContent as getLandingContent, landingCacheTags } from './cms/landing-source'
export type {
  CmsImage,
  ClosingCtaContent,
  HeroContent,
  IntroContent,
  LandingContent,
} from './domain/landing-content'
