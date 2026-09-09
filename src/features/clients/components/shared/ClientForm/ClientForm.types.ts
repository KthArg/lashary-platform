import type { ClientFormValues } from '../../../types/client-form.types'

export interface ClientFormProps {
  /** Valores con los que nace el formulario: vacios en el alta, los de la clienta en la edicion. */
  initialValues: ClientFormValues
  onSubmit: (values: ClientFormValues) => void
  onCancel: () => void
  onDirtyChange: (isDirty: boolean) => void
}
