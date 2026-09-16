import type { LandingContent } from '@/features/content'
import { LandingClosingCta } from './LandingClosingCta'
import { LandingHero } from './LandingHero'
import { LandingIntro } from './LandingIntro'

type LandingHomeProps = {
  content: LandingContent
}

// Página de inicio del sitio público. Recibe el contenido ya resuelto (CMS o respaldo) desde la
// ruta; cada sección de la landing se agrega aquí cuando su historia la entrega.
export function LandingHome({ content }: LandingHomeProps) {
  return (
    <main id="inicio">
      <LandingHero hero={content.hero} />
      <LandingIntro intro={content.intro} />
      <LandingClosingCta closingCta={content.closingCta} />
    </main>
  )
}
