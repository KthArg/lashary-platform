import Link from 'next/link'
import { landingClosingCtaStyles as STYLES } from './LandingClosingCta.styles'
import { RESERVE_ROUTE } from '../../../routes'
import type { LandingClosingCtaProps } from './LandingClosingCta.types'

export function LandingClosingCta({ closingCta }: LandingClosingCtaProps) {
  return (
    <section aria-labelledby="closing-title" className={STYLES.section}>
      <div className={STYLES.inner}>
        <h2 id="closing-title" className={STYLES.heading}>
          {closingCta.heading}
          {closingCta.headingEmphasis && (
            <>
              {' '}
              <span className={STYLES.emphasis}>{closingCta.headingEmphasis}</span>
            </>
          )}
        </h2>
        <div className={STYLES.aside}>
          {closingCta.body && <p className={STYLES.body}>{closingCta.body}</p>}
          <Link href={RESERVE_ROUTE} className={STYLES.cta}>
            {closingCta.ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}
