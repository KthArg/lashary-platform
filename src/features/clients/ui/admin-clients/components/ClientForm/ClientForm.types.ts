import type { ClientFormValues } from '../../../../domain/client-form.types'

export interface ClientFormProps {
  initialValues: ClientFormValues
  onSubmit: (values: ClientFormValues) => void
  onCancel: () => void
  onDirtyChange: (isDirty: boolean) => void
  isSaving?: boolean
  saveError?: string | null
}
