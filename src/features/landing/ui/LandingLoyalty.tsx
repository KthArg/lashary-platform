import type { LoyaltyContent } from '@/features/content'
import { landingLoyaltyStyles as styles } from './LandingLoyalty.styles'
import { landingMessages } from './messages'
import { LOYALTY_SECTION } from './sections'

type LandingLoyaltyProps = {
  loyalty: LoyaltyContent
}

// Sección "Fidelidad" (US-LAND-05): cómo funciona el programa y qué beneficio da cada visita.
// Es solo informativa: el conteo de visitas de cada clienta es el motor de US-LAND-06. Todo sale
// del CMS; sin nada publicado muestra su estado vacío (UI-003) en vez de inventar beneficios.
export function LandingLoyalty({ loyalty }: LandingLoyaltyProps) {
  const copy = landingMessages.loyalty
  const isEmpty = loyalty.paragraphs.length === 0 && loyalty.levels.length === 0

  return (
    <section id={LOYALTY_SECTION.id} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.heading}>
          <h2 className={styles.title}>{copy.title}</h2>
          <span aria-hidden="true" className={styles.rule} />
          <span aria-hidden="true" className={styles.index}>
            {copy.index}
          </span>
        </div>

        {isEmpty ? (
          <p className={styles.empty}>{copy.empty}</p>
        ) : (
          <div className={styles.layout}>
            <div className={styles.text}>
              {loyalty.paragraphs.map((paragraph) => (
                <p key={paragraph} className={styles.paragraph}>
                  {paragraph}
                </p>
              ))}
              {loyalty.note && <p className={styles.note}>{loyalty.note}</p>}
            </div>

            {loyalty.levels.length > 0 && (
              <div className={styles.levels}>
                <h3 className={styles.levelsTitle}>{copy.levelsLabel}</h3>
                <ol className={styles.list}>
                  {loyalty.levels.map((level) => (
                    <li key={level.visit} className={styles.level}>
                      <p className={styles.visit}>{copy.visit(level.visit)}</p>
                      <p className={styles.benefit}>{level.benefit}</p>
                      {level.detail && <p className={styles.detail}>{level.detail}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
