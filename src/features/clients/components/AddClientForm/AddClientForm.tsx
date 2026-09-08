'use client'

import { useEffect } from 'react'
import { useAddClientForm } from '../../hooks/useAddClientForm'
import { CLIENT_FIELD_KEYS, CLIENT_FORM_LIMITS } from '../../constants/client-form'
import { CLIENTS_BUTTON_TEXTS, CLIENTS_ERROR_MESSAGES, CLIENTS_LABELS, CLIENTS_PLACEHOLDERS } from '../../constants/clients-strings'
import { ClientFormField } from '../ClientFormField'
import { addClientFormStyles as s } from './AddClientForm.styles'
import type { AddClientFormProps } from './AddClientForm.types'

export function AddClientForm({ onCreated, onCancel, onDirtyChange }: AddClientFormProps) {
  const { values, errors, wasSubmitted, isDirty, setFieldValue, handleSubmit } = useAddClientForm(onCreated)
  const showSummary = wasSubmitted && Object.keys(errors).length > 0

  useEffect(() => { onDirtyChange(isDirty) }, [isDirty, onDirtyChange])

  return (
    <form onSubmit={handleSubmit} className={s.form} noValidate>
      {showSummary && <div role="alert" className={s.alert}>{CLIENTS_ERROR_MESSAGES.formHasErrors}</div>}

      <ClientFormField name={CLIENT_FIELD_KEYS.fullName} label={CLIENTS_LABELS.fullNameInput} value={values.fullName}
        onChange={setFieldValue} error={errors.fullName} required autoFocus
        placeholder={CLIENTS_PLACEHOLDERS.fullName} maxLength={CLIENT_FORM_LIMITS.fullNameMaxLength} />

      <ClientFormField name={CLIENT_FIELD_KEYS.phone} label={CLIENTS_LABELS.phoneInput} value={values.phone}
        onChange={setFieldValue} error={errors.phone} required type="tel"
        placeholder={CLIENTS_PLACEHOLDERS.phone} maxLength={CLIENT_FORM_LIMITS.phoneMaxLength} />

      <ClientFormField name={CLIENT_FIELD_KEYS.email} label={CLIENTS_LABELS.emailInput} value={values.email}
        onChange={setFieldValue} error={errors.email} required type="email"
        placeholder={CLIENTS_PLACEHOLDERS.email} maxLength={CLIENT_FORM_LIMITS.emailMaxLength} />

      <ClientFormField name={CLIENT_FIELD_KEYS.notes} label={CLIENTS_LABELS.notesInput} value={values.notes}
        onChange={setFieldValue} error={errors.notes} multiline rows={CLIENT_FORM_LIMITS.notesRows}
        placeholder={CLIENTS_PLACEHOLDERS.notes} maxLength={CLIENT_FORM_LIMITS.notesMaxLength} />

      <div className={s.actions}>
        <button type="button" onClick={onCancel} className={s.cancelBtn}>{CLIENTS_BUTTON_TEXTS.cancel}</button>
        <button type="submit" className={s.submitBtn}>{CLIENTS_BUTTON_TEXTS.save}</button>
      </div>
    </form>
  )
}
