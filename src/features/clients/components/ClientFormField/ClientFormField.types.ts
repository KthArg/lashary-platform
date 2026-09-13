import type { ClientFieldKey } from '../../constants/client-form'

export interface ClientFormFieldProps {
  name: ClientFieldKey
  label: string
  value: string
  onChange: (field: ClientFieldKey, value: string) => void
  error?: string
  required?: boolean
  type?: 'text' | 'tel' | 'email'
  placeholder?: string
  maxLength?: number
  multiline?: boolean
  rows?: number
  autoFocus?: boolean
}
