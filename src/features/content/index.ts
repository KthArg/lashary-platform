// Entry point público de la feature content (ARCH-003). Solo servidor: lee el CMS externo
// (uno-cms) según docs/contracts/cms-api.md.

export { loadLandingContent as getLandingContent, landingCacheTags } from './cms/landing-source'
// Borde de POST /api/cms/webhook (aviso al publicar). Lo monta src/app/api/cms/webhook/route.ts.
export { receiveCmsWebhook } from './cms/webhook'
export type {
  CmsImage,
  ClosingCtaContent,
  HeroContent,
  IntroContent,
  LandingContent,
} from './domain/landing-content'
