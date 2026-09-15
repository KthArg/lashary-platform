'use client'

import { useCallback, useState } from 'react'
import { CLIENTS_ERROR_MESSAGES } from '../constants/clients-strings'
import type { ClientFormValues } from '../types/client-form.types'
import type { SaveClientResult } from '../types/client-actions.types'

/**
 * El ciclo que comparten el alta y la edicion: descarte confirmado, guardado en curso y error del servidor.
 * Con la confirmacion abierta, Escape le pertenece a ella; guardando, nada cierra el modal a medias.
 */
export function useClientDialog(save: (values: ClientFormValues) => Promise<SaveClientResult>, onClosed: () => void) {
  const [isDirty, setIsDirty] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const close = useCallback(() => {
    setIsConfirmOpen(false)
    setIsDirty(false)
    setSaveError(null)
    onClosed()
  }, [onClosed])

  const requestClose = useCallback(() => {
    if (isConfirmOpen || isSaving) return
    if (isDirty) setIsConfirmOpen(true)
    else close()
  }, [isConfirmOpen, isSaving, isDirty, close])

  const keepEditing = useCallback(() => setIsConfirmOpen(false), [])

  const submit = useCallback(async (values: ClientFormValues) => {
    setIsSaving(true)
    setSaveError(null)
    // Un fallo de red rechaza la promesa: se muestra como cualquier otro y el formulario conserva lo escrito.
    const result = await save(values).catch(() => null)
    setIsSaving(false)
    if (result?.ok) close()
    else setSaveError(result?.error ?? CLIENTS_ERROR_MESSAGES.saveFailed)
  }, [save, close])

  return { isConfirmOpen, isSaving, saveError, setIsDirty, requestClose, keepEditing, close, submit }
}
