'use client'

import { useId, useState } from 'react'
import { landingFaqStyles as STYLES } from '../LandingFaq/LandingFaq.styles'
import type { FaqListProps } from './FaqList.types'

// Acordeón de preguntas, como el diseño: cada una se abre y se cierra por su cuenta, y la
// primera empieza abierta. Es el único trozo de cliente de la sección.
export function FaqList({ faqs }: FaqListProps) {
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set([0]))
  const baseId = useId()

  const toggle = (index: number) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })

  return (
    <ul className={STYLES.list}>
      {faqs.map((faq, index) => {
        const isOpen = open.has(index)
        const answerId = `${baseId}-${index}`

        return (
          <li key={faq.question} className={STYLES.item}>
            <h3 className={STYLES.question}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={answerId}
                onClick={() => toggle(index)}
                className={STYLES.trigger}
              >
                <span>{faq.question}</span>
                <span aria-hidden="true" className={`${STYLES.sign} ${isOpen ? STYLES.signOpen : ''}`}>
                  +
                </span>
              </button>
            </h3>
            {/* El panel no se desmonta al cerrar: `aria-controls` tiene que resolver siempre a
                un nodo real (UI-004). */}
            <div
              id={answerId}
              hidden={!isOpen}
              className={`${STYLES.answer} ${isOpen ? STYLES.answerOpen : ''}`}
            >
              {faq.paragraphs.map((paragraph) => (
                <p key={paragraph} className={STYLES.paragraph}>
                  {paragraph}
                </p>
              ))}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
