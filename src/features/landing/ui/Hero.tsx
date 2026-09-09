import { LANDING_STRINGS } from '../constants/landing-strings'
import { heroStyles as s } from './Hero.styles'
import type { HeroProps } from './Hero.types'

/**
 * Sección de inicio del sitio público (US-LAND-01, criterio 1): imagen principal, texto de
 * bienvenida y llamado a la acción. El contenido llega del CMS (o del respaldo). El CTA de
 * agendar va deshabilitado hasta que exista la reserva en línea (US-AGE-05).
 */
export function Hero({ content }: HeroProps) {
  return (
    <section className={s.section}>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL del CMS o SVG local;
          next/image + remotePatterns se suma al encender el flag landing_cms_content */}
      <img
        src={content.heroImage.url}
        alt={content.heroImage.alt}
        width={800}
        height={520}
        loading="eager"
        className={s.image}
      />
      <h1 className={s.welcome}>{content.welcomeText}</h1>
      <div className={s.ctaGroup}>
        <button type="button" className={s.cta} disabled>
          {content.ctaLabel}
        </button>
        <p className={s.ctaNote}>{LANDING_STRINGS.bookingComingSoon}</p>
      </div>
    </section>
  )
}
