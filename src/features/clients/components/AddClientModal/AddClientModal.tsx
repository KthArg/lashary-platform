'use client'

import { useEffect } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { CLIENTS_LABELS } from '../../constants/clients-strings'
import { addClientModalStyles as s } from './AddClientModal.styles'
import type { AddClientModalProps } from './AddClientModal.types'

const TITLE_ID = 'add-client-modal-title'

/**
 * Contenedor del modal de alta. Deliberadamente NO se cierra al hacer clic fuera:
 * la unica salida es un gesto explicito (boton Cancelar o Escape), que el contenedor confirma.
 * `isPaused` cede el foco al dialogo de confirmacion cuando este se monta encima (UI-004).
 */
export function AddClientModal({ isOpen, isPaused = false, onRequestClose, children }: AddClientModalProps) {
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
    <div className={s.backdrop} role="dialog" aria-modal="true" aria-labelledby={TITLE_ID}>
      <div ref={cardRef} className={s.card} tabIndex={-1}>
        <div className={s.header}>
          <p className={s.brand}>LASHARY</p>
          <h2 id={TITLE_ID} className={s.title}>{CLIENTS_LABELS.newClientTitle}</h2>
          <p className={s.description}>{CLIENTS_LABELS.newClientDescription}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
