import type {
  ContactContent,
  GalleryPair,
  LandingContent,
  LoyaltyContent,
  StudioContent,
} from '@/features/content'
import { LandingClosingCta } from './LandingClosingCta'
import { LandingFaq } from './LandingFaq'
import { LandingGallery } from './LandingGallery'
import { LandingHero } from './LandingHero'
import { LandingIntro } from './LandingIntro'
import { LandingLocation } from './LandingLocation'
import { LandingLoyalty } from './LandingLoyalty'
import { LandingReasons } from './LandingReasons'
import { LandingStudio } from './LandingStudio'
import { LandingTechniques } from './LandingTechniques'
import type { LandingTechnique } from './technique-view'

type LandingHomeProps = {
  content: LandingContent
  techniques?: readonly LandingTechnique[]
  // `getStudio()` y `getContact()` nunca fallan, así que la ruta siempre los trae.
  studio?: StudioContent
  gallery?: readonly GalleryPair[]
  loyalty?: LoyaltyContent
  contact?: ContactContent
}

// Sin fidelidad publicada la sección muestra su estado vacío, igual que con el CMS caído.
const NO_LOYALTY: LoyaltyContent = { paragraphs: [], note: null, levels: [] }

// Página de inicio del sitio público. Recibe el contenido ya resuelto (CMS o respaldo), las
// técnicas del catálogo, El estudio, los pares de la galería, la fidelidad y el contacto desde la
// ruta; cada sección de la landing se agrega aquí cuando su historia la entrega.
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
