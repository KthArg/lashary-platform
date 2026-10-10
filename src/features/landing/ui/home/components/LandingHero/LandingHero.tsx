'use client'

import Image from 'next/image'
import Link from 'next/link'
import { landingHeroStyles as STYLES } from './LandingHero.styles'
import { RESERVE_ROUTE } from '../../../routes'
import { useOpeningAnimation } from '../../hooks/use-opening-animation'
import type { LandingHeroProps } from './LandingHero.types'

// Hero de la landing (US-LAND-01). El texto viene del CMS vía `content`; el destino de
// "Reservar cita" es fijo. Al bajar, la foto se abre sobre el título (use-opening-animation).
export function LandingHero({ hero }: LandingHeroProps) {
  const { trackRef, photoRef, typeRef } = useOpeningAnimation()
  const showSecondary = hero.secondaryLabel !== null && hero.secondaryHref !== null

  return (
    <section aria-labelledby="hero-title" className={STYLES.section}>
      <div ref={trackRef} className={STYLES.track}>
        <div className={STYLES.stage}>
          <div ref={typeRef} className={STYLES.type}>
            <h1 id="hero-title" className={STYLES.title}>
              <span className={STYLES.titleLead}>{hero.titleLead}</span>
              <span className={STYLES.titleEmphasis}>{hero.titleEmphasis}</span>
            </h1>
            <div className={STYLES.body}>
              {hero.subtitle && <p className={STYLES.subtitle}>{hero.subtitle}</p>}
              <div className={STYLES.actions}>
                <Link href={RESERVE_ROUTE} className={STYLES.primaryCta}>
                  {hero.ctaLabel}
                </Link>
                {showSecondary && (
                  <a href={hero.secondaryHref ?? undefined} className={STYLES.secondaryCta}>
                    {hero.secondaryLabel}
                  </a>
                )}
              </div>
            </div>
          </div>
          <div
            ref={photoRef}
            className={STYLES.photo}
            aria-hidden={hero.image ? undefined : true}
            data-testid="hero-photo"
          >
            {hero.image && (
              <Image src={hero.image.url} alt={hero.image.alt} fill sizes="100vw" className={STYLES.image} />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
