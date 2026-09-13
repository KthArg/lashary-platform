'use client'

import { useEffect, useId } from 'react'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import { CLIENTS_CONFIRM_MESSAGES } from '../../../constants/clients-strings'
import { confirmDialogStyles as s } from './ConfirmDialog.styles'
import type { ConfirmDialogProps } from './ConfirmDialog.types'

/**
 * Confirmacion de una accion destructiva, en el lenguaje visual del proyecto (UI-001).
 * Reemplaza a `window.confirm`, que un iframe sandbox ignora devolviendo `false`.
 * Vive en `clients` y no en `shared` a proposito: es su unico consumidor hoy. Sube a
 * `shared/` cuando aparezca el segundo, no antes.
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = CLIENTS_CONFIRM_MESSAGES.discardConfirm,
  cancelLabel = CLIENTS_CONFIRM_MESSAGES.discardCancel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const messageId = useId()
  // El foco entra en la opcion que no destruye nada: es el primer boton de la tarjeta (UI-004).
  const cardRef = useFocusTrap<HTMLDivElement>(isOpen)

  // Escape equivale a la salida segura, nunca a la destructiva.
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className={s.backdrop}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
    >
      <div ref={cardRef} className={s.card} tabIndex={-1}>
        <h2 id={titleId} className={s.title}>{title}</h2>
        <p id={messageId} className={s.message}>{message}</p>
        <div className={s.actions}>
          <button type="button" onClick={onCancel} className={s.cancelBtn}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className={s.confirmBtn}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
