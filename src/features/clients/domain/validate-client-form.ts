import { CLIENT_FIELD_KEYS, CLIENT_FORM_LIMITS, CLIENT_FORM_PATTERNS } from './client-form'
import { CLIENT_VALIDATION_MESSAGES } from './client-validation-messages'
import type { ClientFormErrors, ClientFormValues } from './client-form.types'

const countDigits = (value: string): number => value.replace(/\D/g, '').length

export function validateClientForm(values: ClientFormValues): ClientFormErrors {
  const errors: ClientFormErrors = {}
  const fullName = values.fullName.trim()
  const phone = values.phone.trim()
  const email = values.email.trim()

  if (!fullName) errors[CLIENT_FIELD_KEYS.fullName] = CLIENT_VALIDATION_MESSAGES.fullNameRequired
  else if (fullName.length < CLIENT_FORM_LIMITS.fullNameMinLength) errors[CLIENT_FIELD_KEYS.fullName] = CLIENT_VALIDATION_MESSAGES.fullNameTooShort
  else if (fullName.length > CLIENT_FORM_LIMITS.fullNameMaxLength) errors[CLIENT_FIELD_KEYS.fullName] = CLIENT_VALIDATION_MESSAGES.fullNameTooLong

  if (!phone) errors[CLIENT_FIELD_KEYS.phone] = CLIENT_VALIDATION_MESSAGES.phoneRequired
  else if (phone.length > CLIENT_FORM_LIMITS.phoneMaxLength) errors[CLIENT_FIELD_KEYS.phone] = CLIENT_VALIDATION_MESSAGES.phoneTooLong
  else if (!CLIENT_FORM_PATTERNS.phone.test(phone)) errors[CLIENT_FIELD_KEYS.phone] = CLIENT_VALIDATION_MESSAGES.phoneInvalidFormat
  else if (countDigits(phone) < CLIENT_FORM_LIMITS.phoneMinDigits) errors[CLIENT_FIELD_KEYS.phone] = CLIENT_VALIDATION_MESSAGES.phoneTooShort

  if (!email) errors[CLIENT_FIELD_KEYS.email] = CLIENT_VALIDATION_MESSAGES.emailRequired
  else if (email.length > CLIENT_FORM_LIMITS.emailMaxLength) errors[CLIENT_FIELD_KEYS.email] = CLIENT_VALIDATION_MESSAGES.emailTooLong
  else if (!CLIENT_FORM_PATTERNS.email.test(email)) errors[CLIENT_FIELD_KEYS.email] = CLIENT_VALIDATION_MESSAGES.emailInvalidFormat

  if (values.notes.length > CLIENT_FORM_LIMITS.notesMaxLength) errors[CLIENT_FIELD_KEYS.notes] = CLIENT_VALIDATION_MESSAGES.notesTooLong

  return errors
}

export const hasClientFormErrors = (errors: ClientFormErrors): boolean => Object.keys(errors).length > 0
