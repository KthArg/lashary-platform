import { CLIENT_PHONE_FORMAT } from '../constants/client-form'

/**
 * Una sola forma guardada por telefono: `8888 7777`, `8888-7777` y `88887777` son la misma clienta.
 * Sin `+`, el numero es de Costa Rica y se le antepone el codigo; con `+`, se respeta el que trae.
 * Idempotente: normalizar un telefono ya guardado devuelve el mismo valor.
 */
export function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (trimmed.startsWith('+')) return `+${digits}`
  if (digits.length === CLIENT_PHONE_FORMAT.localDigits) return `${CLIENT_PHONE_FORMAT.countryPrefix}${digits}`
  return `+${digits}`
}
