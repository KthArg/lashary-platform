import type { LoyaltyContent } from '@/features/content'
import { LandingClosingCta } from '../LandingClosingCta'
import { LandingFaq } from '../LandingFaq'
import { LandingGallery } from '../LandingGallery'
import { LandingHero } from '../LandingHero'
import { LandingIntro } from '../LandingIntro'
import { LandingLocation } from '../LandingLocation'
import { LandingLoyalty } from '../LandingLoyalty'
import { LandingReasons } from '../LandingReasons'
import { LandingStudio } from '../LandingStudio'
import { LandingTechniques } from '../LandingTechniques'
import type { LandingHomeProps } from './LandingHome.types'

const NO_LOYALTY: LoyaltyContent = { paragraphs: [], note: null, levels: [] }

export function LandingHome({
  content,
  techniques = [],
  studio,
  gallery = [],
  loyalty = NO_LOYALTY,
  contact,
}: LandingHomeProps) {
  return (
    <main id="inicio">
      <LandingHero hero={content.hero} />
      <LandingIntro intro={content.intro} />
      <LandingTechniques techniques={techniques} />
      {studio && (
        <>
          <LandingStudio studio={studio} />
          <LandingReasons reasons={studio.reasons} />
        </>
      )}
      <LandingGallery pairs={gallery} />
      <LandingLoyalty loyalty={loyalty} />
      {contact && (
        <>
          <LandingFaq faqs={contact.faqs} />
          <LandingLocation contact={contact.contact} hours={contact.hours} />
        </>
      )}
      <LandingClosingCta closingCta={content.closingCta} />
    </main>
  )
}
