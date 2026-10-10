import { landingIntroStyles as styles } from './LandingIntro.styles'
import type { LandingIntroProps } from './LandingIntro.types'

// Bienvenida bajo el hero (US-LAND-01): una frase destacada y el párrafo que la acompaña.
export function LandingIntro({ intro }: LandingIntroProps) {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.statement}>{intro.statement}</p>
        {intro.body && <p className={styles.body}>{intro.body}</p>}
      </div>
    </section>
  )
}
