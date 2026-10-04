import type { Reason } from '@/features/content'
import { landingReasonsStyles as styles } from './LandingReasons.styles'
import { landingMessages } from './messages'

type LandingReasonsProps = {
  reasons: readonly Reason[]
}

// Sección "Por qué acá" (US-LAND-04, plegada a la historia por decisión del PO): qué distingue
// al estudio. Nunca llega vacía: sin razones publicadas, `content` entrega las del diseño.
export function LandingReasons({ reasons }: LandingReasonsProps) {
  const copy = landingMessages.reasons

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{copy.title}</h2>
          <span aria-hidden="true" className={styles.rule} />
          <span aria-hidden="true" className={styles.index}>
            {copy.index}
          </span>
        </div>

        <ol className={styles.list}>
          {reasons.map((reason) => (
            <li key={reason.title} className={styles.item}>
              <h3 className={styles.itemTitle}>{reason.title}</h3>
              <p className={styles.itemText}>{reason.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
