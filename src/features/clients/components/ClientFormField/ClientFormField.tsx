'use client'

import { CLIENTS_LABELS } from '../../constants/clients-strings'
import { clientFormFieldStyles as s } from './ClientFormField.styles'
import type { ClientFormFieldProps } from './ClientFormField.types'

/** Un campo etiquetado del formulario de clienta: label, control y su mensaje de error. */
export function ClientFormField({
  name, label, value, onChange, error, required = false,
  type = 'text', placeholder, maxLength, multiline = false, rows, autoFocus = false,
}: ClientFormFieldProps) {
  const isInvalid = Boolean(error)
  const errorId = `${name}-error`
  const shared = {
    id: name, name, value, placeholder, maxLength, autoFocus,
    'aria-invalid': isInvalid, 'aria-describedby': isInvalid ? errorId : undefined,
    className: isInvalid ? s.inputInvalid : s.input,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(name, event.target.value),
  }

  return (
    <div className={s.field}>
      <div className={s.labelRow}>
        <label htmlFor={name} className={isInvalid ? s.labelInvalid : s.label}>{label}</label>
        <span className={isInvalid ? s.markInvalid : s.mark}>
          {required ? CLIENTS_LABELS.requiredMark : CLIENTS_LABELS.optionalMark}
        </span>
      </div>
      {multiline ? <textarea {...shared} rows={rows} /> : <input {...shared} type={type} />}
      {isInvalid && <p id={errorId} role="alert" className={s.message}>{error}</p>}
    </div>
  )
}
