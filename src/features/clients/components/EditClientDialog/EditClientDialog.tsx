'use client'

import { useCallback, useState } from 'react'
import { CLIENTS_CONFIRM_MESSAGES, CLIENTS_CONSOLE_MESSAGES, CLIENTS_LABELS } from '../../constants/clients-strings'
import { ClientModal } from '../ClientModal'
import { ClientForm } from '../ClientForm'
import { ConfirmDialog } from '../ConfirmDialog'
import type { ClientFormValues } from '../../types/client-form.types'
import type { EditClientDialogProps } from './EditClientDialog.types'

/**
 * US-CLI-05 criterio 2: el mismo modal, formulario y confirmacion del alta, con los datos cargados.
 * `key={client.id}` evita que pasar de una clienta a otra reuse el estado del formulario anterior.
 */
export function EditClientDialog({ client, onClose }: EditClientDialogProps) {
  const [isDirty, setIsDirty] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const isOpen = client !== null

  const close = useCallback(() => {
    setIsConfirmOpen(false)
    setIsDirty(false)
    onClose()
  }, [onClose])

  // Mismo descarte confirmado que AddClientDialog: con la confirmacion abierta, Escape le pertenece a ella.
  const requestClose = useCallback(() => {
    if (isConfirmOpen) return
    if (isDirty) setIsConfirmOpen(true)
    else close()
  }, [isConfirmOpen, isDirty, close])

  const handleUpdated = useCallback((values: ClientFormValues) => {
    console.log(CLIENTS_CONSOLE_MESSAGES.clientUpdated, values)
    close()
  }, [close])

  return (
    <>
      <ClientModal isOpen={isOpen} title={CLIENTS_LABELS.editClientTitle} description={CLIENTS_LABELS.editClientDescription}
        isPaused={isConfirmOpen} onRequestClose={requestClose}>
        {client && (
          <ClientForm key={client.id} initialValues={client} onSubmit={handleUpdated} onCancel={requestClose} onDirtyChange={setIsDirty} />
        )}
      </ClientModal>
      <ConfirmDialog isOpen={isOpen && isConfirmOpen} title={CLIENTS_CONFIRM_MESSAGES.discardEditsTitle}
        message={CLIENTS_CONFIRM_MESSAGES.discardEdits} onConfirm={close} onCancel={() => setIsConfirmOpen(false)} />
    </>
  )
}
