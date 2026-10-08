import { landingReasonsStyles as STYLES } from './LandingReasons.styles'
import { landingMessages } from '../../../constants/landing-strings'
import type { LandingReasonsProps } from './LandingReasons.types'

export function LandingReasons({ reasons }: LandingReasonsProps) {
  const copy = landingMessages.reasons

  return (
    <section className={STYLES.section}>
      <div className={STYLES.inner}>
        <div className={STYLES.heading}>
          <h2 className={STYLES.title}>{copy.title}</h2>
          <span aria-hidden="true" className={STYLES.rule} />
          <span aria-hidden="true" className={STYLES.index}>
            {copy.index}
          </span>
        </div>

        <ol className={STYLES.list}>
          {reasons.map((reason) => (
            <li key={reason.title} className={STYLES.item}>
              <h3 className={STYLES.itemTitle}>{reason.title}</h3>
              <p className={STYLES.itemText}>{reason.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
