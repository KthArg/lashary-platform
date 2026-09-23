// Entry point público de la feature landing (ARCH-003): el sitio público.

export { SiteHeader } from './ui/SiteHeader'
export { SiteFooter } from './ui/SiteFooter'
export { LandingHome } from './ui/LandingHome'
export { LandingHero } from './ui/LandingHero'
export { LandingIntro } from './ui/LandingIntro'
export { LandingClosingCta } from './ui/LandingClosingCta'
export { LandingTechniques } from './ui/LandingTechniques'
export { LandingGallery } from './ui/LandingGallery'
export { LandingStudio } from './ui/LandingStudio'
export { LandingReasons } from './ui/LandingReasons'
export { LandingLoyalty } from './ui/LandingLoyalty'
export { LandingLocation } from './ui/LandingLocation'
export { LandingFaq } from './ui/LandingFaq'
export {
  landingSections,
  TECHNIQUES_SECTION,
  GALLERY_SECTION,
  STUDIO_SECTION,
  LOYALTY_SECTION,
  FAQ_SECTION,
  LOCATION_SECTION,
  type SiteSection,
} from './ui/sections'
export { RESERVE_ROUTE, reserveRouteFor, RESERVE_TECHNIQUE_PARAM } from './ui/routes'
export { toLandingTechnique, formatColones, type LandingTechnique } from './ui/technique-view'
export { landingMessages } from './ui/messages'
