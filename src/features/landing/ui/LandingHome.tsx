import type { LandingContent } from '@/features/content'
import { LandingClosingCta } from './LandingClosingCta'
import { LandingHero } from './LandingHero'
import { LandingIntro } from './LandingIntro'
import { LandingTechniques } from './LandingTechniques'
import type { LandingTechnique } from './technique-view'

type LandingHomeProps = {
  content: LandingContent
  techniques?: readonly LandingTechnique[]
}

// Página de inicio del sitio público. Recibe el contenido ya resuelto (CMS o respaldo) y las
// técnicas del catálogo desde la ruta; cada sección de la landing se agrega aquí cuando su
// historia la entrega.
export function LandingHome({ content, techniques = [] }: LandingHomeProps) {
  return (
    <main id="inicio">
      <LandingHero hero={content.hero} />
      <LandingIntro intro={content.intro} />
      <LandingTechniques techniques={techniques} />
      <LandingClosingCta closingCta={content.closingCta} />
    </main>
  )
}
