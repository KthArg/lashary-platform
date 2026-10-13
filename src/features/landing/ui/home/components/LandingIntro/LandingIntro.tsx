import { landingIntroStyles as STYLES } from './LandingIntro.styles'
import type { LandingIntroProps } from './LandingIntro.types'

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
