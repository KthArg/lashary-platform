'use client'

import { useEffect, useId } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { clientModalStyles as STYLES } from './ClientModal.styles'
import type { ClientModalProps } from './ClientModal.types'

export function ClientModal({ isOpen, title, description, isPaused = false, onRequestClose, children }: ClientModalProps) {
  const titleId = useId()
  const cardRef = useFocusTrap<HTMLDivElement>(isOpen && !isPaused)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onRequestClose() }
    document.addEventListener('keydown', handleKeyDown)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, onRequestClose])

  if (!isOpen) return null

  return (
    <div className={STYLES.backdrop} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div ref={cardRef} className={STYLES.card} tabIndex={-1}>
        <div className={STYLES.header}>
          <p className={STYLES.brand}>LASHARY</p>
          <h2 id={titleId} className={STYLES.title}>{title}</h2>
          <p className={STYLES.description}>{description}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
