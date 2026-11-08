export const NOTE_ERROR_CODES = {
  invalid: 'CLIENTS_NOTE_INVALID',
} as const

export type NoteProblem = 'note-empty' | 'note-too-long'

export interface NoteValidationError {
  readonly code: typeof NOTE_ERROR_CODES.invalid
  readonly problem: NoteProblem
}

export function noteValidationError(problem: NoteProblem): NoteValidationError {
  return { code: NOTE_ERROR_CODES.invalid, problem }
}

export const isNoteValidationError = (error: unknown): error is NoteValidationError =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === NOTE_ERROR_CODES.invalid
