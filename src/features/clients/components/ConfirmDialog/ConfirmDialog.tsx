'use client'

import { useEffect, useId } from 'react'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { CLIENTS_CONFIRM_MESSAGES } from '../../constants/clients-strings'
import { confirmDialogStyles as STYLES } from './ConfirmDialog.styles'
import type { ConfirmDialogProps } from './ConfirmDialog.types'

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
  const cardRef = useFocusTrap<HTMLDivElement>(isOpen)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className={STYLES.backdrop}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
    >
      <div ref={cardRef} className={STYLES.card} tabIndex={-1}>
        <h2 id={titleId} className={STYLES.title}>{title}</h2>
        <p id={messageId} className={STYLES.message}>{message}</p>
        <div className={STYLES.actions}>
          <button type="button" onClick={onCancel} className={STYLES.cancelBtn}>{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className={STYLES.confirmBtn}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
