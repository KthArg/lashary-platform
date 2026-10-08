// Entry point público de la feature landing (ARCH-003): el sitio público.

export { SiteHeader } from './ui/site-shell/components/SiteHeader/SiteHeader'
export { SiteFooter } from './ui/site-shell/components/SiteFooter/SiteFooter'
export { LandingHome } from './ui/home/components/LandingHome/LandingHome'
export { LandingHero } from './ui/home/components/LandingHero/LandingHero'
export { LandingIntro } from './ui/home/components/LandingIntro/LandingIntro'
export { LandingClosingCta } from './ui/home/components/LandingClosingCta/LandingClosingCta'
export { LandingTechniques } from './ui/home/components/LandingTechniques/LandingTechniques'
export { LandingGallery } from './ui/home/components/LandingGallery/LandingGallery'
export { LandingStudio } from './ui/home/components/LandingStudio/LandingStudio'
export { LandingReasons } from './ui/home/components/LandingReasons/LandingReasons'
export { LandingLoyalty } from './ui/home/components/LandingLoyalty/LandingLoyalty'
export { LandingLocation } from './ui/home/components/LandingLocation/LandingLocation'
export { LandingFaq } from './ui/home/components/LandingFaq/LandingFaq'
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
export { LOGIN_ROUTE, RESERVE_ROUTE, reserveRouteFor, RESERVE_TECHNIQUE_PARAM } from './ui/routes'
export { toLandingTechnique, formatColones, type LandingTechnique } from './ui/technique-view'
export { landingMessages } from './ui/constants/landing-strings'
