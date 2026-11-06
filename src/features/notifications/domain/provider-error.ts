export const MAX_PROVIDER_ERROR_LENGTH = 500
export const MASKED_PHONE_NUMBER = '[teléfono oculto]'

const PHONE_NUMBER_PATTERN = /\+?\d(?:[\s().-]*\d){7,}/g

export const sanitizeProviderError = (error: string): string => {
  const masked = error.replace(PHONE_NUMBER_PATTERN, MASKED_PHONE_NUMBER)
  return masked.length > MAX_PROVIDER_ERROR_LENGTH ? `${masked.slice(0, MAX_PROVIDER_ERROR_LENGTH)}…` : masked
}
