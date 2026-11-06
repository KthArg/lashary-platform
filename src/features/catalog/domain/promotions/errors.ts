export const PROMOTION_ERROR_CODES = {
  invalid: 'CATALOG_PROMOTION_INVALID',
  notFound: 'CATALOG_PROMOTION_NOT_FOUND',
} as const

type PromotionErrorCode = (typeof PROMOTION_ERROR_CODES)[keyof typeof PROMOTION_ERROR_CODES]

function hasCode<T extends { code: PromotionErrorCode }>(
  error: unknown,
  code: T['code'],
): error is T {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === code
}

export interface PromotionValidationError {
  readonly code: typeof PROMOTION_ERROR_CODES.invalid
  readonly message: string
  readonly problems: string[]
}

export function promotionValidationError(problems: string[]): PromotionValidationError {
  return {
    code: PROMOTION_ERROR_CODES.invalid,
    message: `promoción inválida: ${problems.join('; ')}`,
    problems,
  }
}

export const isPromotionValidationError = (error: unknown): error is PromotionValidationError =>
  hasCode<PromotionValidationError>(error, PROMOTION_ERROR_CODES.invalid)

export interface PromotionNotFound {
  readonly code: typeof PROMOTION_ERROR_CODES.notFound
  readonly message: string
  readonly promotionId: string
}

export function promotionNotFound(promotionId: string): PromotionNotFound {
  return {
    code: PROMOTION_ERROR_CODES.notFound,
    message: `no existe la promoción ${promotionId}`,
    promotionId,
  }
}

export const isPromotionNotFound = (error: unknown): error is PromotionNotFound =>
  hasCode<PromotionNotFound>(error, PROMOTION_ERROR_CODES.notFound)
