'use client'

import { useCallback } from 'react'
import { updateClientAction } from '../../actions/clients-actions'
import { CLIENTS_CONFIRM_MESSAGES, CLIENTS_LABELS } from '../../constants/clients-strings'
import { useClientDialog } from '../../hooks/useClientDialog'
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
  const clientId = client?.id ?? ''
  const save = useCallback((values: ClientFormValues) => updateClientAction(clientId, values), [clientId])
  const dialog = useClientDialog(save, onClose)
  const isOpen = client !== null

  return (
    <>
      <ClientModal isOpen={isOpen} title={CLIENTS_LABELS.editClientTitle} description={CLIENTS_LABELS.editClientDescription}
        isPaused={dialog.isConfirmOpen} onRequestClose={dialog.requestClose}>
        {client && (
          <ClientForm key={client.id} initialValues={client} onSubmit={dialog.submit} onCancel={dialog.requestClose}
            onDirtyChange={dialog.setIsDirty} isSaving={dialog.isSaving} saveError={dialog.saveError} />
        )}
      </ClientModal>
      <ConfirmDialog isOpen={isOpen && dialog.isConfirmOpen} title={CLIENTS_CONFIRM_MESSAGES.discardEditsTitle}
        message={CLIENTS_CONFIRM_MESSAGES.discardEdits} onConfirm={dialog.close} onCancel={dialog.keepEditing} />
    </>
  )
}
