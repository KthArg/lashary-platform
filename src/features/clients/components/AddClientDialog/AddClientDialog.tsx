'use client'

import { useCallback, useRef, useState } from 'react'
import { useClientFormDialog } from '../../hooks/useClientFormDialog'
import { EMPTY_CLIENT_FORM_VALUES } from '../../constants/client-form'
import { CLIENTS_CONFIRM_MESSAGES, CLIENTS_CONSOLE_MESSAGES, CLIENTS_LABELS } from '../../constants/clients-strings'
import { AddClientButton } from '../AddClientButton'
import { ClientModal } from '../shared/ClientModal'
import { ClientForm } from '../shared/ClientForm'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { ClientFormValues } from '../../types/client-form.types'

/** Coordina el boton, el modal de alta y el descarte confirmado del formulario en curso. */
export function AddClientDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const handleClosed = useCallback(() => {
    setIsOpen(false)
    // El foco vuelve a donde estaba antes de abrir, no al principio del documento (UI-004).
    triggerRef.current?.focus()
  }, [])

  const { isConfirmOpen, setIsDirty, close, requestClose, keepEditing } = useClientFormDialog(handleClosed)

  const handleCreated = useCallback((values: ClientFormValues) => {
    // US-CLI-05 criterio 1: por ahora solo se reporta; la persistencia llega con la migracion.
    console.log(CLIENTS_CONSOLE_MESSAGES.clientCreated, values)
    close()
  }, [close])

  return (
    <>
      <AddClientButton ref={triggerRef} onClick={() => setIsOpen(true)} />
      <ClientModal
        isOpen={isOpen}
        title={CLIENTS_LABELS.newClientTitle}
        description={CLIENTS_LABELS.newClientDescription}
        isPaused={isConfirmOpen}
        onRequestClose={requestClose}
      >
        <ClientForm
          initialValues={EMPTY_CLIENT_FORM_VALUES}
          onSubmit={handleCreated}
          onCancel={requestClose}
          onDirtyChange={setIsDirty}
        />
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
