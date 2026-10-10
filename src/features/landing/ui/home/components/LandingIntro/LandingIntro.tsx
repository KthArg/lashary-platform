import { landingIntroStyles as STYLES } from './LandingIntro.styles'
import type { LandingIntroProps } from './LandingIntro.types'

// Bienvenida bajo el hero (US-LAND-01): una frase destacada y el párrafo que la acompaña.
export function LandingIntro({ intro }: LandingIntroProps) {
  return (
    <section className={STYLES.section}>
      <div className={STYLES.inner}>
        <p className={STYLES.statement}>{intro.statement}</p>
        {intro.body && <p className={STYLES.body}>{intro.body}</p>}
      </div>
    </section>
  )
}
