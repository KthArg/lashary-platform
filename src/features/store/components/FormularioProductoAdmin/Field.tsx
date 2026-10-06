import { formularioProductoAdminStyles as STYLES } from './FormularioProductoAdmin.styles'

type Props = {
  name: string
  label: string
  defaultValue?: string | number
  type?: 'text' | 'number'
  required?: boolean
  min?: number
}

export function Field({ name, label, defaultValue, type = 'text', required, min }: Props) {
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
