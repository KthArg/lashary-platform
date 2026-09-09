export interface ConfirmDialogProps {
  isOpen: boolean
  /** Encabezado corto de la decisión. Lo aporta quien lo usa (DOM-009). */
  title: string
  /** Explicación de la consecuencia de confirmar. */
  message: string
  /** Etiqueta de la acción destructiva. Por defecto, la genérica de `CONFIRM_DIALOG_TEXTS`. */
  confirmLabel?: string
  /** Etiqueta de la salida segura. Por defecto, la genérica de `CONFIRM_DIALOG_TEXTS`. */
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}
