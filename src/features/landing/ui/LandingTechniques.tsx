import { landingMessages } from './messages'
import { landingTechniquesStyles as styles } from './LandingTechniques.styles'
import { TechniqueList } from './TechniqueList'
import { TECHNIQUES_SECTION } from './sections'
import type { LandingTechnique } from './technique-view'

type LandingTechniquesProps = {
  techniques: readonly LandingTechnique[]
}

// Sección "Servicios" (US-LAND-02): las técnicas del catálogo que administra la dueña, con su
// precio y su duración. La sección se renderiza siempre —el ancla de la navegación tiene que
// existir— y sin técnicas muestra su estado vacío (UI-003).
export function LandingTechniques({ techniques }: LandingTechniquesProps) {
  const copy = landingMessages.techniques

  return (
    <section id={TECHNIQUES_SECTION.id} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{copy.title}</h2>
          <span aria-hidden="true" className={styles.rule} />
          <span aria-hidden="true" className={styles.index}>
            {copy.index}
          </span>
        </div>

        {techniques.length === 0 ? (
          <p className={styles.empty}>{copy.empty}</p>
        ) : (
          <TechniqueList techniques={techniques} />
        )}
      </div>
    </section>
  )
}
