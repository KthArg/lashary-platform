'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useId, useState } from 'react'
import { landingMessages } from './messages'
import { landingTechniquesStyles as styles } from './LandingTechniques.styles'
import { reserveRouteFor } from './routes'
import { formatColones, type LandingTechnique } from './technique-view'

type TechniqueListProps = {
  techniques: readonly LandingTechnique[]
}

const NONE_OPEN = -1

// Lista de técnicas en acordeón, como el diseño: una fila abierta a la vez, y volver a pulsar la
// abierta la cierra. Es el único trozo de cliente de la sección; los datos ya llegan resueltos.
export function TechniqueList({ techniques }: TechniqueListProps) {
  const [openIndex, setOpenIndex] = useState(NONE_OPEN)
  const copy = landingMessages.techniques
  const baseId = useId()

  return (
    <ul className={styles.list}>
      {techniques.map((technique, index) => {
        const isOpen = openIndex === index
        const bodyId = `${baseId}-${technique.id}`

        return (
          <li key={technique.id} className={styles.row}>
            <button
              type="button"
              className={styles.trigger}
              aria-expanded={isOpen}
              aria-controls={bodyId}
              onClick={() => setOpenIndex(isOpen ? NONE_OPEN : index)}
            >
              <span className={styles.name}>{technique.name}</span>
              <span className={styles.meta}>
                {technique.durationFirstTimeMin} {copy.minutes}
              </span>
              <span className={styles.meta}>{formatColones(technique.priceFirstTime)}</span>
              <span
                aria-hidden="true"
                className={`${styles.sign} ${isOpen ? styles.signOpen : ''}`}
              >
                +
              </span>
            </button>

            {/* El panel no se desmonta al cerrar: `aria-controls` del botón debe resolver
                siempre a un nodo real, aunque la fila esté cerrada (UI-004). */}
            <div
              id={bodyId}
              hidden={!isOpen}
              className={`${styles.body} ${isOpen ? styles.bodyOpen : ''}`}
            >
                <div className={styles.layout}>
                  {technique.image && (
                    <figure className={styles.figure}>
                      <Image
                        src={technique.image.url}
                        alt={technique.image.alt}
                        fill
                        className={styles.photo}
                        sizes="(max-width: 768px) 100vw, 22rem"
                      />
                    </figure>
                  )}

                  <div className={styles.column}>
                    {technique.description && (
                      <p className={styles.description}>{technique.description}</p>
                    )}

                    {technique.examples.length > 0 && (
                      <ul className={styles.examples}>
                        {technique.examples.map((example) => (
                          <li key={example.url} className={styles.example}>
                            <Image
                              src={example.url}
                              alt={example.alt}
                              fill
                              className={styles.photo}
                              sizes="5.5rem"
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className={styles.detail}>
                  <span className={styles.detailItem}>
                    {copy.firstTime}: {formatColones(technique.priceFirstTime)} ·{' '}
                    {technique.durationFirstTimeMin} {copy.minutes}
                  </span>
                  {/* Solo las técnicas que se retocan tienen segundo precio (criterio 3). */}
                  {technique.priceRetouch !== null && (
                    <span className={styles.detailItem}>
                      {copy.retouch}: {formatColones(technique.priceRetouch)}
                      {technique.durationRetouchMin !== null &&
                        ` · ${technique.durationRetouchMin} ${copy.minutes}`}
                    </span>
                  )}
                </div>

                <div className={styles.detail}>
                  <Link href={reserveRouteFor(technique.id)} className={styles.reserve}>
                    {copy.reserve}
                  </Link>
                </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
