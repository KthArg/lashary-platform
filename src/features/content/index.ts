// Entry point público de la feature content (ARCH-003). Solo servidor: lee el CMS externo
// (uno-cms) según docs/contracts/cms-api.md.

export { loadLandingContent as getLandingContent, landingCacheTags } from './cms/landing-source'
export {
  loadTechniqueMedia as getTechniqueMedia,
  techniqueMediaCacheTag,
} from './cms/technique-media-source'
export { loadGallery as getGallery, galleryCacheTag } from './cms/gallery-source'
export { loadStudio as getStudio, studioCacheTags } from './cms/studio-source'
export { loadLoyalty as getLoyalty, loyaltyCacheTags } from './cms/loyalty-source'
// Borde de POST /api/cms/webhook (aviso al publicar). Lo monta src/app/api/cms/webhook/route.ts.
export { receiveCmsWebhook } from './cms/webhook'
export type { TechniqueMedia, TechniqueMediaByFamily } from './domain/technique-media'
export type { GalleryFamily, GalleryPair } from './domain/gallery'
export type { LoyaltyContent, LoyaltyLevel } from './domain/loyalty'
export type {
  Credential,
  CredentialKind,
  Reason,
  StudioContent,
  StudioProfile,
} from './domain/studio'
export type {
  CmsImage,
  ClosingCtaContent,
  HeroContent,
  IntroContent,
  LandingContent,
} from './domain/landing-content'
