'use client'

import { useCallback, useRef, useState } from 'react'
import { EMPTY_CLIENT_FORM_VALUES } from '../../constants/client-form'
import { CLIENTS_CONFIRM_MESSAGES, CLIENTS_CONSOLE_MESSAGES, CLIENTS_LABELS } from '../../constants/clients-strings'
import { AddClientButton } from '../AddClientButton'
import { ClientModal } from '../ClientModal'
import { ClientForm } from '../ClientForm'
import { ConfirmDialog } from '../ConfirmDialog'
import type { ClientFormValues } from '../../types/client-form.types'

/** Coordina el boton, el modal y el descarte confirmado del formulario en curso. */
export function AddClientDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => {
    setIsConfirmOpen(false)
    setIsOpen(false)
    setIsDirty(false)
    // El foco vuelve a donde estaba antes de abrir, no al principio del documento (UI-004).
    triggerRef.current?.focus()
  }, [])

  const requestClose = useCallback(() => {
    // Con la confirmacion abierta, Escape le pertenece a ella y no reabre la pregunta.
    if (isConfirmOpen) return
    if (isDirty) {
      setIsConfirmOpen(true)
      return
    }
    close()
  }, [isConfirmOpen, isDirty, close])

  const keepEditing = useCallback(() => setIsConfirmOpen(false), [])

  const handleCreated = useCallback((values: ClientFormValues) => {
    // US-CLI-05 criterio 1: por ahora solo se reporta; la persistencia llega con el server action.
    console.log(CLIENTS_CONSOLE_MESSAGES.clientCreated, values)
    close()
  }, [close])

  return (
    <>
      <AddClientButton ref={triggerRef} onClick={() => setIsOpen(true)} />
      <ClientModal isOpen={isOpen} title={CLIENTS_LABELS.newClientTitle} description={CLIENTS_LABELS.newClientDescription}
        isPaused={isConfirmOpen} onRequestClose={requestClose}>
        <ClientForm initialValues={EMPTY_CLIENT_FORM_VALUES} onSubmit={handleCreated} onCancel={requestClose} onDirtyChange={setIsDirty} />
      </ClientModal>
      <ConfirmDialog
        isOpen={isOpen && isConfirmOpen}
        title={CLIENTS_CONFIRM_MESSAGES.discardFormTitle}
        message={CLIENTS_CONFIRM_MESSAGES.discardForm}
        onConfirm={close}
        onCancel={keepEditing}
      />
    </>
  )
}
