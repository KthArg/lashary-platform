export interface TechniqueFormFieldProps {
  name: string
  label: string
  defaultValue?: string | number | null
  type?: 'text' | 'number'
  required?: boolean
  min?: number
}
