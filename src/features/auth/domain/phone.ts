export type PhoneValidationError = 'phoneMinLength' | 'phoneInvalidFormat'

export function validateClientPhone(raw: string | null | undefined): PhoneValidationError | null {
  const phone = raw?.trim() ?? ''
  if (phone.length < 8) return 'phoneMinLength'
  if (!/^[0-9+ ]{8,20}$/.test(phone)) return 'phoneInvalidFormat'
  return null
}
