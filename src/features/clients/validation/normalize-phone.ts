import { CLIENT_PHONE_FORMAT } from '../constants/client-form'

export function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (trimmed.startsWith('+')) return `+${digits}`
  if (digits.length === CLIENT_PHONE_FORMAT.localDigits) return `${CLIENT_PHONE_FORMAT.countryPrefix}${digits}`
  return `+${digits}`
}
