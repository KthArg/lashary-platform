import Link from 'next/link'
import type { ClosingCtaContent } from '@/features/content'
import { landingClosingCtaStyles as styles } from './LandingClosingCta.styles'
import { RESERVE_ROUTE } from './routes'

type LandingClosingCtaProps = {
  closingCta: ClosingCtaContent
}

// Llamada final a reservar (US-LAND-01). Mismo destino fijo que el hero y la cabecera.
export function LandingClosingCta({ closingCta }: LandingClosingCtaProps) {
  return (
    <section aria-labelledby="closing-title" className={styles.section}>
      <div className={styles.inner}>
        <h2 id="closing-title" className={styles.heading}>
          {closingCta.heading}
          {closingCta.headingEmphasis && (
            <>
              {' '}
              <span className={styles.emphasis}>{closingCta.headingEmphasis}</span>
            </>
          )}
        </h2>
        <div className={styles.aside}>
          {closingCta.body && <p className={styles.body}>{closingCta.body}</p>}
          <Link href={RESERVE_ROUTE} className={styles.cta}>
            {closingCta.ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}
