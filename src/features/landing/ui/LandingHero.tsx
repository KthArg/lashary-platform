'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { HeroContent } from '@/features/content'
import { landingHeroStyles as styles } from './LandingHero.styles'
import { RESERVE_ROUTE } from './routes'
import { useOpeningAnimation } from './use-opening-animation'

type LandingHeroProps = {
  hero: HeroContent
}

// Hero de la landing (US-LAND-01). El texto viene del CMS vía `content`; el destino de
// "Reservar cita" es fijo. Al bajar, la foto se abre sobre el título (use-opening-animation).
export function LandingHero({ hero }: LandingHeroProps) {
  const { trackRef, photoRef, typeRef } = useOpeningAnimation()
  const showSecondary = hero.secondaryLabel !== null && hero.secondaryHref !== null

  return (
    <section aria-labelledby="hero-title" className={styles.section}>
      <div ref={trackRef} className={styles.track}>
        <div className={styles.stage}>
          <div ref={typeRef} className={styles.type}>
            <h1 id="hero-title" className={styles.title}>
              <span className={styles.titleLead}>{hero.titleLead}</span>
              <span className={styles.titleEmphasis}>{hero.titleEmphasis}</span>
            </h1>
            <div className={styles.body}>
              {hero.subtitle && <p className={styles.subtitle}>{hero.subtitle}</p>}
              <div className={styles.actions}>
                <Link href={RESERVE_ROUTE} className={styles.primaryCta}>
                  {hero.ctaLabel}
                </Link>
                {showSecondary && (
                  <a href={hero.secondaryHref ?? undefined} className={styles.secondaryCta}>
                    {hero.secondaryLabel}
                  </a>
                )}
              </div>
            </div>
          </div>
          <div
            ref={photoRef}
            className={styles.photo}
            aria-hidden={hero.image ? undefined : true}
            data-testid="hero-photo"
          >
            {hero.image && (
              <Image src={hero.image.url} alt={hero.image.alt} fill sizes="100vw" className={styles.image} />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
