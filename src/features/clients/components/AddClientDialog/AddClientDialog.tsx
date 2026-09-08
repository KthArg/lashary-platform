'use client'

import { useCallback, useState } from 'react'
import { ConfirmDialog } from '@/shared/components'
import { CLIENTS_CONFIRM_MESSAGES } from '../../constants/clients-strings'
import { AddClientButton } from '../AddClientButton'
import { AddClientModal } from '../AddClientModal'
import { AddClientForm } from '../AddClientForm'

/** Coordina el boton, el modal y el descarte confirmado del formulario en curso. */
export function AddClientDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const close = useCallback(() => {
    setIsConfirmOpen(false)
    setIsOpen(false)
    setIsDirty(false)
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

  return (
    <>
      <AddClientButton onClick={() => setIsOpen(true)} />
      <AddClientModal isOpen={isOpen} onRequestClose={requestClose}>
        <AddClientForm onCreated={close} onCancel={requestClose} onDirtyChange={setIsDirty} />
      </AddClientModal>
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
