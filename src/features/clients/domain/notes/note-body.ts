import { ok, err, type Result } from '@/shared/result'
import { NOTE_LIMITS } from './note-limits'
import { noteValidationError, type NoteValidationError } from './note-errors'

const noteBodyBrand: unique symbol = Symbol('NoteBody')

export interface NoteBody {
  readonly text: string
  readonly [noteBodyBrand]: true
}

const characterCount = (text: string): number => Array.from(text).length

export function buildNoteBody(rawText: string): Result<NoteBody, NoteValidationError> {
  const text = rawText.trim()
  if (text.length === 0) return err(noteValidationError('note-empty'))
  if (characterCount(text) > NOTE_LIMITS.bodyMaxLength) return err(noteValidationError('note-too-long'))
  return ok({ [noteBodyBrand]: true, text })
}
