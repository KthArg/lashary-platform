export const RECORD_ERROR_CODES = {
  invalid: 'CLIENTS_RECORD_INVALID',
  precautionNotFound: 'CLIENTS_RECORD_PRECAUTION_NOT_FOUND',
  unchanged: 'CLIENTS_RECORD_UNCHANGED',
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

export interface PrecautionNotFound {
  readonly code: typeof RECORD_ERROR_CODES.precautionNotFound
  readonly precautionId: string
}

export interface RecordUnchanged {
  readonly code: typeof RECORD_ERROR_CODES.unchanged
}

export function recordValidationError(problems: readonly RecordProblem[]): RecordValidationError {
  return { code: RECORD_ERROR_CODES.invalid, problems }
}

export function precautionNotFound(precautionId: string): PrecautionNotFound {
  return { code: RECORD_ERROR_CODES.precautionNotFound, precautionId }
}

export function recordUnchanged(): RecordUnchanged {
  return { code: RECORD_ERROR_CODES.unchanged }
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code
}

export const isRecordValidationError = (error: unknown): error is RecordValidationError =>
  hasCode(error, RECORD_ERROR_CODES.invalid)

export const isPrecautionNotFound = (error: unknown): error is PrecautionNotFound =>
  hasCode(error, RECORD_ERROR_CODES.precautionNotFound)

export const isRecordUnchanged = (error: unknown): error is RecordUnchanged =>
  hasCode(error, RECORD_ERROR_CODES.unchanged)
