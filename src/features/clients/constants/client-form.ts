// Claves, limites y patrones del formulario de alta de clienta.
// Sin numeros ni cadenas sueltas en la logica: todo entra por aqui.

export const CLIENT_FIELD_KEYS = { fullName: 'fullName', phone: 'phone', email: 'email', notes: 'notes' } as const

export type ClientFieldKey = (typeof CLIENT_FIELD_KEYS)[keyof typeof CLIENT_FIELD_KEYS]

export const REQUIRED_CLIENT_FIELDS: readonly ClientFieldKey[] = [
  CLIENT_FIELD_KEYS.fullName, CLIENT_FIELD_KEYS.phone, CLIENT_FIELD_KEYS.email,
]

export const CLIENT_FORM_LIMITS = {
  fullNameMinLength: 3, fullNameMaxLength: 120, phoneMinDigits: 8, phoneMaxLength: 20,
  emailMaxLength: 150, notesMaxLength: 500, notesRows: 3,
} as const

export const CLIENT_FORM_PATTERNS = { phone: /^[0-9+\s-]+$/, email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ } as const

export const EMPTY_CLIENT_FORM_VALUES = { fullName: '', phone: '', email: '', notes: '' } as const
