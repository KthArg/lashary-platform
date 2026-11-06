'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useId, useState } from 'react'
import { landingMessages } from '../../../constants/landing-strings'
import { landingTechniquesStyles as STYLES } from '../LandingTechniques/LandingTechniques.styles'
import { reserveRouteFor } from '../../../routes'
import { formatColones } from '../../../format-colones'
import type { TechniqueListProps } from './TechniqueList.types'

const NONE_OPEN = -1

function PriceTag({
  price,
  discountedPrice,
}: {
  price: number
  discountedPrice: number | null
}) {
  if (discountedPrice === null) return <>{formatColones(price)}</>
  return (
    <>
      <span className={STYLES.priceOriginal}>{formatColones(price)}</span>{' '}
      <span className={STYLES.priceDiscounted}>{formatColones(discountedPrice)}</span>
    </>
  )
}

export function TechniqueList({ techniques }: TechniqueListProps) {
  const [openIndex, setOpenIndex] = useState(NONE_OPEN)
  const copy = landingMessages.techniques
  const baseId = useId()

  return (
    <ul className={STYLES.list}>
      {techniques.map((technique, index) => {
        const isOpen = openIndex === index
        const bodyId = `${baseId}-${technique.id}`

        return (
          <li key={technique.id} className={STYLES.row}>
            <button
              type="button"
              className={STYLES.trigger}
              aria-expanded={isOpen}
              aria-controls={bodyId}
              onClick={() => setOpenIndex(isOpen ? NONE_OPEN : index)}
            >
              <span className={STYLES.name}>{technique.name}</span>
              <span className={STYLES.meta}>
                {technique.durationFirstTimeMin} {copy.minutes}
              </span>
              <span className={STYLES.meta}>
                <PriceTag price={technique.priceFirstTime} discountedPrice={technique.priceFirstTimeDiscounted} />
              </span>
              <span
                aria-hidden="true"
                className={`${STYLES.sign} ${isOpen ? STYLES.signOpen : ''}`}
              >
                +
              </span>
            </button>

            <div
              id={bodyId}
              hidden={!isOpen}
              className={`${STYLES.body} ${isOpen ? STYLES.bodyOpen : ''}`}
            >
                <div className={STYLES.layout}>
                  {technique.image && (
                    <figure className={STYLES.figure}>
                      <Image
                        src={technique.image.url}
                        alt={technique.image.alt}
                        fill
                        className={STYLES.photo}
                        sizes="(max-width: 768px) 100vw, 22rem"
                      />
                    </figure>
                  )}

                  <div className={STYLES.column}>
                    {technique.description && (
                      <p className={STYLES.description}>{technique.description}</p>
                    )}

                    {technique.examples.length > 0 && (
                      <ul className={STYLES.examples}>
                        {technique.examples.map((example) => (
                          <li key={example.url} className={STYLES.example}>
                            <Image
                              src={example.url}
                              alt={example.alt}
                              fill
                              className={STYLES.photo}
                              sizes="5.5rem"
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className={STYLES.detail}>
                  <span className={STYLES.detailItem}>
                    {copy.firstTime}:{' '}
                    <PriceTag price={technique.priceFirstTime} discountedPrice={technique.priceFirstTimeDiscounted} />{' '}
                    · {technique.durationFirstTimeMin} {copy.minutes}
                  </span>
                  {technique.priceRetouch !== null && (
                    <span className={STYLES.detailItem}>
                      {copy.retouch}:{' '}
                      <PriceTag price={technique.priceRetouch} discountedPrice={technique.priceRetouchDiscounted} />
                      {technique.durationRetouchMin !== null &&
                        ` · ${technique.durationRetouchMin} ${copy.minutes}`}
                    </span>
                  )}
                  {technique.discountPercent !== null && (
                    <span role="note" className={STYLES.promoBadge}>
                      {copy.promotion(technique.discountPercent)}
                    </span>
                  )}
                </div>

                <div className={STYLES.detail}>
                  <Link href={reserveRouteFor(technique.id)} className={STYLES.reserve}>
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
