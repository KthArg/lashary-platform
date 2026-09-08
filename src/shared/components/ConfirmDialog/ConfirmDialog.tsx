'use client'

import { useEffect, useId, useRef } from 'react'
import { CONFIRM_DIALOG_TEXTS } from '../../constants/ui-strings'
import { confirmDialogStyles as s } from './ConfirmDialog.styles'
import type { ConfirmDialogProps } from './ConfirmDialog.types'

/**
 * Confirmación de una acción destructiva, en el lenguaje visual del proyecto (UI-001).
 * Reemplaza a `window.confirm`, que un iframe sandbox ignora devolviendo `false`
 * y deja la decisión sin tomar. Sin reglas de negocio: los textos llegan por props (ARCH-007).
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = CONFIRM_DIALOG_TEXTS.confirm,
  cancelLabel = CONFIRM_DIALOG_TEXTS.cancel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const messageId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Escape equivale a la salida segura, nunca a la destructiva.
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  // El foco entra en la opción que no destruye nada (UI-004).
  useEffect(() => {
    if (isOpen) cancelRef.current?.focus()
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className={s.backdrop} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={messageId}>
      <div className={s.card}>
        <h2 id={titleId} className={s.title}>{title}</h2>
        <p id={messageId} className={s.message}>{message}</p>
        <div className={s.actions}>
          <button ref={cancelRef} type="button" onClick={onCancel} className={s.cancelBtn}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className={s.confirmBtn}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
