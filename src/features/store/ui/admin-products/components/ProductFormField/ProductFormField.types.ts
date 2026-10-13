export interface ProductFormFieldProps {
  name: string
  label: string
  defaultValue?: string | number
  type?: 'text' | 'number'
  required?: boolean
  min?: number
}
