'use client'

import { useCallback, useRef, useState } from 'react'
import { createClientAction } from '../../actions/clients-actions'
import { EMPTY_CLIENT_FORM_VALUES } from '../../constants/client-form'
import { CLIENTS_CONFIRM_MESSAGES, CLIENTS_LABELS } from '../../constants/clients-strings'
import { useClientDialog } from '../../hooks/useClientDialog'
import { AddClientButton } from '../AddClientButton'
import { ClientModal } from '../ClientModal'
import { ClientForm } from '../ClientForm'
import { ConfirmDialog } from '../ConfirmDialog'

export function AddClientDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const onClosed = useCallback(() => {
    setIsOpen(false)
    triggerRef.current?.focus()
  }, [])

  const dialog = useClientDialog(createClientAction, onClosed)

  return (
    <>
      <AddClientButton ref={triggerRef} onClick={() => setIsOpen(true)} />
      <ClientModal isOpen={isOpen} title={CLIENTS_LABELS.newClientTitle} description={CLIENTS_LABELS.newClientDescription}
        isPaused={dialog.isConfirmOpen} onRequestClose={dialog.requestClose}>
        <ClientForm initialValues={EMPTY_CLIENT_FORM_VALUES} onSubmit={dialog.submit} onCancel={dialog.requestClose}
          onDirtyChange={dialog.setIsDirty} isSaving={dialog.isSaving} saveError={dialog.saveError} />
      </ClientModal>
      <ConfirmDialog
        isOpen={isOpen && dialog.isConfirmOpen}
        title={CLIENTS_CONFIRM_MESSAGES.discardFormTitle}
        message={CLIENTS_CONFIRM_MESSAGES.discardForm}
        onConfirm={dialog.close}
        onCancel={dialog.keepEditing}
      />
    </>
  )
}
