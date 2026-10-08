import { FaqList } from '../FaqList'
import { landingFaqStyles as styles } from './LandingFaq.styles'
import { landingMessages } from '../../../constants/landing-strings'
import { FAQ_SECTION } from '../../../sections'
import type { LandingFaqProps } from './LandingFaq.types'

// Sección "Preguntas" (plegada a US-LAND-07 por decisión del PO): resuelve dudas antes de
// contactar. Nunca llega vacía: sin preguntas publicadas, `content` entrega las del diseño.
export function LandingFaq({ faqs }: LandingFaqProps) {
  const copy = landingMessages.faq

  return (
    <section id={FAQ_SECTION.id} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{copy.title}</h2>
          <span aria-hidden="true" className={styles.rule} />
          <span aria-hidden="true" className={styles.index}>
            {copy.index}
          </span>
        </div>
        <FaqList faqs={faqs} />
      </div>
    </section>
  )
}
