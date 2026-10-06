import { formularioProductoAdminStyles as s } from './FormularioProductoAdmin.styles'

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
    <label className={s.fieldLabel} htmlFor={name}>
      <span className={s.labelText}>{label}</span>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        min={min}
        step={1}
        defaultValue={defaultValue}
        className={s.fieldInput}
      />
    </label>
  )
}
