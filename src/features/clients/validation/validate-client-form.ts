import { CLIENT_FIELD_KEYS, CLIENT_FORM_LIMITS, CLIENT_FORM_PATTERNS } from '../constants/client-form'
import { CLIENTS_ERROR_MESSAGES } from '../constants/clients-strings'
import type { ClientFormErrors, ClientFormValues } from '../types/client-form.types'

const countDigits = (value: string): number => value.replace(/\D/g, '').length

/** Validacion de formato en el borde (DOM-007): unica fuente de verdad del formulario. */
export function validateClientForm(values: ClientFormValues): ClientFormErrors {
  const errors: ClientFormErrors = {}
  const fullName = values.fullName.trim()
  const phone = values.phone.trim()
  const email = values.email.trim()

  if (!fullName) errors[CLIENT_FIELD_KEYS.fullName] = CLIENTS_ERROR_MESSAGES.fullNameRequired
  else if (fullName.length < CLIENT_FORM_LIMITS.fullNameMinLength) errors[CLIENT_FIELD_KEYS.fullName] = CLIENTS_ERROR_MESSAGES.fullNameTooShort

  if (!phone) errors[CLIENT_FIELD_KEYS.phone] = CLIENTS_ERROR_MESSAGES.phoneRequired
  else if (!CLIENT_FORM_PATTERNS.phone.test(phone)) errors[CLIENT_FIELD_KEYS.phone] = CLIENTS_ERROR_MESSAGES.phoneInvalidFormat
  else if (countDigits(phone) < CLIENT_FORM_LIMITS.phoneMinDigits) errors[CLIENT_FIELD_KEYS.phone] = CLIENTS_ERROR_MESSAGES.phoneTooShort

  if (!email) errors[CLIENT_FIELD_KEYS.email] = CLIENTS_ERROR_MESSAGES.emailRequired
  else if (!CLIENT_FORM_PATTERNS.email.test(email)) errors[CLIENT_FIELD_KEYS.email] = CLIENTS_ERROR_MESSAGES.emailInvalidFormat

  if (values.notes.length > CLIENT_FORM_LIMITS.notesMaxLength) errors[CLIENT_FIELD_KEYS.notes] = CLIENTS_ERROR_MESSAGES.notesTooLong

  return errors
}

export const hasClientFormErrors = (errors: ClientFormErrors): boolean => Object.keys(errors).length > 0
