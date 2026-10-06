import { formularioProductoAdminStyles as s } from './FormularioProductoAdmin.styles'

const PASO_INPUT_NUMERICO = 1
const FILAS_TEXTAREA = 3

type Props = {
  name: string
  label: string
  defaultValue?: string | number
  type?: 'text' | 'number' | 'multiline'
  required?: boolean
  min?: number
}

export function Field({ name, label, defaultValue, type = 'text', required, min }: Props) {
  if (type === 'multiline') {
    return (
      <label className={s.descripcionLabel} htmlFor={name}>
        <span className={s.labelText}>{label}</span>
        <textarea
          id={name}
          name={name}
          rows={FILAS_TEXTAREA}
          defaultValue={defaultValue}
          className={s.textarea}
        />
      </label>
    )
  }

  return (
    <label className={s.fieldLabel} htmlFor={name}>
      <span className={s.labelText}>{label}</span>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        min={min}
        step={type === 'number' ? PASO_INPUT_NUMERICO : undefined}
        defaultValue={defaultValue}
        className={s.fieldInput}
      />
    </label>
  )
}
