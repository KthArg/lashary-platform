import { landingLoyaltyStyles as STYLES } from './LandingLoyalty.styles'
import { landingMessages } from '../../../constants/landing-strings'
import { LOYALTY_SECTION } from '../../../sections'
import type { LandingLoyaltyProps } from './LandingLoyalty.types'

// Sección "Fidelidad" (US-LAND-05): cómo funciona el programa y qué beneficio da cada visita.
// Es solo informativa: el conteo de visitas de cada clienta es el motor de US-LAND-06. Todo sale
// del CMS; sin nada publicado muestra su estado vacío (UI-003) en vez de inventar beneficios.
export function LandingLoyalty({ loyalty }: LandingLoyaltyProps) {
  const copy = landingMessages.loyalty
  const isEmpty = loyalty.paragraphs.length === 0 && loyalty.levels.length === 0

  return (
    <section id={LOYALTY_SECTION.id} className={STYLES.section}>
      <div className={STYLES.inner}>
        <div className={STYLES.heading}>
          <h2 className={STYLES.title}>{copy.title}</h2>
          <span aria-hidden="true" className={STYLES.rule} />
          <span aria-hidden="true" className={STYLES.index}>
            {copy.index}
          </span>
        </div>

        {isEmpty ? (
          <p className={STYLES.empty}>{copy.empty}</p>
        ) : (
          <div className={STYLES.layout}>
            <div className={STYLES.text}>
              {loyalty.paragraphs.map((paragraph) => (
                <p key={paragraph} className={STYLES.paragraph}>
                  {paragraph}
                </p>
              ))}
              {loyalty.note && <p className={STYLES.note}>{loyalty.note}</p>}
            </div>

            {loyalty.levels.length > 0 && (
              <div className={STYLES.levels}>
                <h3 className={STYLES.levelsTitle}>{copy.levelsLabel}</h3>
                <ol className={STYLES.list}>
                  {loyalty.levels.map((level) => (
                    <li key={level.visit} className={STYLES.level}>
                      <p className={STYLES.visit}>{copy.visit(level.visit)}</p>
                      <p className={STYLES.benefit}>{level.benefit}</p>
                      {level.detail && <p className={STYLES.detail}>{level.detail}</p>}
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
