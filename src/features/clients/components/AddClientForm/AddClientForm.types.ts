export interface AddClientFormProps {
  onCreated: () => void
  onCancel: () => void
  onDirtyChange: (isDirty: boolean) => void
}
