'use client'

import { useCallback, useMemo } from 'react'
import { useClientFormDialog } from '../../hooks/useClientFormDialog'
import { CLIENTS_CONFIRM_MESSAGES, CLIENTS_CONSOLE_MESSAGES, CLIENTS_LABELS } from '../../constants/clients-strings'
import { ClientModal } from '../shared/ClientModal'
import { ClientForm } from '../shared/ClientForm'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import type { ClientFormValues } from '../../types/client-form.types'
import type { EditClientDialogProps } from './EditClientDialog.types'

/**
 * US-CLI-05 criterio 2. Mismo modal, mismo formulario y misma confirmacion que el alta: lo unico
 * propio es que nace con los datos de la clienta y que el mensaje de descarte habla de CAMBIOS.
 *
 * El formulario lleva `key={client.id}`: sin eso, pasar de una clienta a otra reusaria el estado
 * del formulario anterior y la admin editaria a una viendo los datos de la otra.
 */
export function EditClientDialog({ client, onClose }: EditClientDialogProps) {
  const { isConfirmOpen, setIsDirty, close, requestClose, keepEditing } = useClientFormDialog(onClose)

  const handleUpdated = useCallback((values: ClientFormValues) => {
    // Criterio 2: por ahora solo se reporta; la persistencia llega con la migracion y el server action.
    console.log(CLIENTS_CONSOLE_MESSAGES.clientUpdated, values)
    close()
  }, [close])

  // Solo los cuatro campos del formulario: el id no es un valor editable y no debe entrar al estado.
  const initialValues = useMemo<ClientFormValues | null>(
    () => (client ? { fullName: client.fullName, phone: client.phone, email: client.email, notes: client.notes } : null),
    [client],
  )

  const isOpen = client !== null

  return (
    <>
      <ClientModal
        isOpen={isOpen}
        title={CLIENTS_LABELS.editClientTitle}
        description={CLIENTS_LABELS.editClientDescription}
        isPaused={isConfirmOpen}
        onRequestClose={requestClose}
      >
        {client && initialValues && (
          <ClientForm
            key={client.id}
            initialValues={initialValues}
            onSubmit={handleUpdated}
            onCancel={requestClose}
            onDirtyChange={setIsDirty}
          />
        )}
      </ClientModal>
      <ConfirmDialog
        isOpen={isOpen && isConfirmOpen}
        title={CLIENTS_CONFIRM_MESSAGES.discardEditsTitle}
        message={CLIENTS_CONFIRM_MESSAGES.discardEdits}
        onConfirm={close}
        onCancel={keepEditing}
      />
    </>
  )
}
