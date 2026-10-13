import { productFormStyles as STYLES } from '../ProductForm/ProductForm.styles'
import type { ProductFormFieldProps } from './ProductFormField.types'

export function ProductFormField({
  name,
  label,
  defaultValue,
  type = 'text',
  required,
  min,
}: ProductFormFieldProps) {
  return (
    <label className={STYLES.fieldLabel} htmlFor={name}>
      <span className={STYLES.labelText}>{label}</span>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        min={min}
        step={1}
        defaultValue={defaultValue}
        className={STYLES.fieldInput}
      />
    </label>
  )
}
