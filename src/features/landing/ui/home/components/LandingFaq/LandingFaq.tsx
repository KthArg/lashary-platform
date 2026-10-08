import { FaqList } from '../FaqList'
import { landingFaqStyles as STYLES } from './LandingFaq.styles'
import { landingMessages } from '../../../constants/landing-strings'
import { FAQ_SECTION } from '../../../sections'
import type { LandingFaqProps } from './LandingFaq.types'

// Sección "Preguntas" (plegada a US-LAND-07 por decisión del PO): resuelve dudas antes de
// contactar. Nunca llega vacía: sin preguntas publicadas, `content` entrega las del diseño.
export function LandingFaq({ faqs }: LandingFaqProps) {
  const copy = landingMessages.faq

  return (
    <section id={FAQ_SECTION.id} className={STYLES.section}>
      <div className={STYLES.inner}>
        <div className={STYLES.heading}>
          <h2 className={STYLES.title}>{copy.title}</h2>
          <span aria-hidden="true" className={STYLES.rule} />
          <span aria-hidden="true" className={STYLES.index}>
            {copy.index}
          </span>
        </div>
        <FaqList faqs={faqs} />
      </div>
    </section>
  )
}
