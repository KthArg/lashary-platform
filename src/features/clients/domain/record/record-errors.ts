export const RECORD_ERROR_CODES = {
  invalid: 'CLIENTS_RECORD_INVALID',
} as const

export type RecordProblem =
  | 'study-text-empty'
  | 'study-text-too-long'
  | 'technique-name-empty'
  | 'technique-name-too-long'
  | 'too-many-precautions'
  | 'precaution-category-empty'
  | 'precaution-description-empty'
  | 'precaution-description-too-long'
  | 'duplicate-precaution'
  | 'too-many-images'
  | 'image-path-empty'
  | 'duplicate-image'

export interface RecordValidationError {
  readonly code: typeof RECORD_ERROR_CODES.invalid
  readonly problems: readonly RecordProblem[]
}

export function recordValidationError(problems: readonly RecordProblem[]): RecordValidationError {
  return { code: RECORD_ERROR_CODES.invalid, problems }
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code
}

export const isRecordValidationError = (error: unknown): error is RecordValidationError =>
  hasCode(error, RECORD_ERROR_CODES.invalid)
