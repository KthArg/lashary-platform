import type { GalleryPair, LandingContent, StudioContent } from '@/features/content'
import { LandingClosingCta } from './LandingClosingCta'
import { LandingGallery } from './LandingGallery'
import { LandingHero } from './LandingHero'
import { LandingIntro } from './LandingIntro'
import { LandingReasons } from './LandingReasons'
import { LandingStudio } from './LandingStudio'
import { LandingTechniques } from './LandingTechniques'
import type { LandingTechnique } from './technique-view'

type LandingHomeProps = {
  content: LandingContent
  techniques?: readonly LandingTechnique[]
  // `getStudio()` nunca falla (cae al respaldo), así que la ruta siempre lo trae.
  studio?: StudioContent
  gallery?: readonly GalleryPair[]
}

// Página de inicio del sitio público. Recibe el contenido ya resuelto (CMS o respaldo), las
// técnicas del catálogo, El estudio y los pares de la galería desde la ruta; cada sección de la landing se
// agrega aquí cuando su historia la entrega.
export function LandingHome({ content, techniques = [], studio, gallery = [] }: LandingHomeProps) {
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
      <LandingClosingCta closingCta={content.closingCta} />
    </main>
  )
}
