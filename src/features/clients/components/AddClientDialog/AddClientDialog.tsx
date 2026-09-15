'use client'

import { useCallback, useRef, useState } from 'react'
import { createClientAction } from '../../actions/clients-actions'
import { EMPTY_CLIENT_FORM_VALUES } from '../../constants/client-form'
import { CLIENTS_CONFIRM_MESSAGES, CLIENTS_ERROR_MESSAGES, CLIENTS_LABELS } from '../../constants/clients-strings'
import { AddClientButton } from '../AddClientButton'
import { ClientModal } from '../ClientModal'
import { ClientForm } from '../ClientForm'
import { ConfirmDialog } from '../ConfirmDialog'
import type { ClientFormValues } from '../../types/client-form.types'

/** Coordina el boton, el modal, el descarte confirmado y el guardado de la clienta nueva (US-CLI-05 criterio 1). */
export function AddClientDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const close = useCallback(() => {
    setIsConfirmOpen(false)
    setIsOpen(false)
    setIsDirty(false)
    setSaveError(null)
    // El foco vuelve a donde estaba antes de abrir, no al principio del documento (UI-004).
    triggerRef.current?.focus()
  }, [])

  const requestClose = useCallback(() => {
    // Con la confirmacion abierta, Escape le pertenece a ella; guardando, nada cierra el modal a medias.
    if (isConfirmOpen || isSaving) return
    if (isDirty) {
      setIsConfirmOpen(true)
      return
    }
    close()
  }, [isConfirmOpen, isSaving, isDirty, close])

  const keepEditing = useCallback(() => setIsConfirmOpen(false), [])

  const handleCreated = useCallback(async (values: ClientFormValues) => {
    setIsSaving(true)
    setSaveError(null)
    // Un fallo de red rechaza la promesa: se muestra como cualquier otro y el formulario conserva lo escrito.
    const result = await createClientAction(values).catch(() => null)
    setIsSaving(false)
    if (result?.ok) close()
    else setSaveError(result?.error ?? CLIENTS_ERROR_MESSAGES.saveFailed)
  }, [close])

  return (
    <>
      <AddClientButton ref={triggerRef} onClick={() => setIsOpen(true)} />
      <ClientModal isOpen={isOpen} title={CLIENTS_LABELS.newClientTitle} description={CLIENTS_LABELS.newClientDescription}
        isPaused={isConfirmOpen} onRequestClose={requestClose}>
        <ClientForm initialValues={EMPTY_CLIENT_FORM_VALUES} onSubmit={handleCreated} onCancel={requestClose}
          onDirtyChange={setIsDirty} isSaving={isSaving} saveError={saveError} />
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
