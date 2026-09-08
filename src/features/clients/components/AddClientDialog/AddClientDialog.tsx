'use client'

import { useCallback, useState } from 'react'
import { CLIENTS_CONFIRM_MESSAGES } from '../../constants/clients-strings'
import { AddClientButton } from '../AddClientButton'
import { AddClientModal } from '../AddClientModal'
import { AddClientForm } from '../AddClientForm'

/** Coordina el boton, el modal y el descarte confirmado del formulario en curso. */
export function AddClientDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const close = useCallback(() => { setIsOpen(false); setIsDirty(false) }, [])

  const requestClose = useCallback(() => {
    if (isDirty && !window.confirm(CLIENTS_CONFIRM_MESSAGES.discardForm)) return
    close()
  }, [isDirty, close])

  return (
    <>
      <AddClientButton onClick={() => setIsOpen(true)} />
      <AddClientModal isOpen={isOpen} onRequestClose={requestClose}>
        <AddClientForm onCreated={close} onCancel={requestClose} onDirtyChange={setIsDirty} />
      </AddClientModal>
    </>
  )
}
