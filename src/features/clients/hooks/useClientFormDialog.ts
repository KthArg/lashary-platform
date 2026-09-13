'use client'

import { useCallback, useState } from 'react'

/**
 * La coordinacion comun del alta y la edicion: el formulario avisa si esta sucio, y salir con
 * cambios pendientes pasa primero por una confirmacion. Vivia duplicada dentro de AddClientDialog;
 * al aparecer el segundo consumidor (EditClientDialog) se extrajo aqui en vez de copiarse.
 *
 * `onClose` lo aporta quien abre el dialogo: es el unico que sabe a que control devolver el foco
 * (UI-004) — el boton Agregar en el alta, el lapiz de esa fila en la edicion.
 */
export function useClientFormDialog(onClose: () => void) {
  const [isDirty, setIsDirty] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  const close = useCallback(() => {
    setIsConfirmOpen(false)
    setIsDirty(false)
    onClose()
  }, [onClose])

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

  return { isDirty, setIsDirty, isConfirmOpen, close, requestClose, keepEditing }
}
