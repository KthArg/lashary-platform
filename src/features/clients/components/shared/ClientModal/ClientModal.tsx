'use client'

import { useEffect, useId } from 'react'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import { clientModalStyles as s } from './ClientModal.styles'
import type { ClientModalProps } from './ClientModal.types'

/**
 * Contenedor del modal de clienta, para el alta y para la edicion. Deliberadamente NO se cierra
 * al hacer clic fuera: la unica salida es un gesto explicito (boton Cancelar o Escape), que el
 * contenedor confirma. `isPaused` cede el foco al dialogo de confirmacion cuando se monta encima
 * (UI-004). El id del titulo sale de useId y no de una constante de modulo: con dos modales en el
 * arbol, un id fijo se duplicaria y aria-labelledby apuntaria al equivocado.
 */
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
    <div className={s.backdrop} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div ref={cardRef} className={s.card} tabIndex={-1}>
        <div className={s.header}>
          <p className={s.brand}>LASHARY</p>
          <h2 id={titleId} className={s.title}>{title}</h2>
          <p className={s.description}>{description}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
