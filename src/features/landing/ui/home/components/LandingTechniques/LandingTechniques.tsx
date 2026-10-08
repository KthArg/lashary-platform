import { landingMessages } from '../../../constants/landing-strings'
import { landingTechniquesStyles as STYLES } from './LandingTechniques.styles'
import { TechniqueList } from '../TechniqueList'
import { TECHNIQUES_SECTION } from '../../../sections'
import type { LandingTechniquesProps } from './LandingTechniques.types'

// Sección "Servicios" (US-LAND-02): las técnicas del catálogo que administra la dueña, con su
// precio y su duración. La sección se renderiza siempre —el ancla de la navegación tiene que
// existir— y sin técnicas muestra su estado vacío (UI-003).
export function LandingTechniques({ techniques }: LandingTechniquesProps) {
  const copy = landingMessages.techniques

  return (
    <section id={TECHNIQUES_SECTION.id} className={STYLES.section}>
      <div className={STYLES.inner}>
        <div className={STYLES.heading}>
          <h2 className={STYLES.title}>{copy.title}</h2>
          <span aria-hidden="true" className={STYLES.rule} />
          <span aria-hidden="true" className={STYLES.index}>
            {copy.index}
          </span>
        </div>

        {techniques.length === 0 ? (
          <p className={STYLES.empty}>{copy.empty}</p>
        ) : (
          <TechniqueList techniques={techniques} />
        )}
      </div>
    </section>
  )
}
