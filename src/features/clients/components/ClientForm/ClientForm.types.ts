import type { ClientFormValues } from '../../types/client-form.types'

export interface ClientFormProps {
  initialValues: ClientFormValues
  onSubmit: (values: ClientFormValues) => void
  onCancel: () => void
  onDirtyChange: (isDirty: boolean) => void
  /** Deshabilita Guardar mientras el server action responde: evita la clienta duplicada por doble clic. */
  isSaving?: boolean
  /** Mensaje del servidor; los errores de campo siguen siendo del formulario. */
  saveError?: string | null
}
