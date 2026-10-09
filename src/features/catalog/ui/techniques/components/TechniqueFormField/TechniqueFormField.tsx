import { techniqueFormFieldStyles as STYLES } from './TechniqueFormField.styles'
import type { TechniqueFormFieldProps } from './TechniqueFormField.types'

export function TechniqueFormField({
  name,
  label,
  defaultValue,
  type = 'text',
  required,
  min,
}: TechniqueFormFieldProps) {
  return (
    <label className={STYLES.fieldLabel} htmlFor={name}>
      <span className={STYLES.labelText}>{label}</span>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        min={min}
        step={type === 'number' ? 1 : undefined}
        defaultValue={defaultValue ?? undefined}
        className={STYLES.fieldInput}
      />
    </label>
  )
}
