'use client'

import { CLIENTS_LABELS } from '../../constants/clients-strings'
import { clientFormFieldStyles as STYLES } from './ClientFormField.styles'
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
    className: isInvalid ? STYLES.inputInvalid : STYLES.input,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(name, event.target.value),
  }

  return (
    <div className={STYLES.field}>
      <div className={STYLES.labelRow}>
        <label htmlFor={name} className={isInvalid ? STYLES.labelInvalid : STYLES.label}>{label}</label>
        <span className={isInvalid ? STYLES.markInvalid : STYLES.mark}>
          {required ? CLIENTS_LABELS.requiredMark : CLIENTS_LABELS.optionalMark}
        </span>
      </div>
      {multiline ? <textarea {...shared} rows={rows} /> : <input {...shared} type={type} />}
      {isInvalid && <p id={errorId} role="alert" className={STYLES.message}>{error}</p>}
    </div>
  )
}
