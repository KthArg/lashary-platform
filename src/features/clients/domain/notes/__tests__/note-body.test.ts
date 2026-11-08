import { describe, it, expect } from 'vitest'
import { isOk } from '@/shared/result'
import { buildNoteBody } from '../note-body'
import { isNoteValidationError, noteValidationError } from '../note-errors'
import { NOTE_LIMITS } from '../note-limits'

const problemOf = (rawText: string) => {
  const result = buildNoteBody(rawText)
  return result.ok ? null : result.error.problem
}

describe('buildNoteBody — el texto de una anotación', () => {
  it('quita los espacios de los extremos y conserva los de adentro', () => {
    const result = buildNoteBody('  Llegó con  los ojos irritados \n')
    if (!isOk(result)) throw new Error('debería aceptar el texto')
    expect(result.value.text).toBe('Llegó con  los ojos irritados')
  })

  it('rechaza un texto vacío o hecho solo de espacios', () => {
    expect(problemOf('')).toBe('note-empty')
    expect(problemOf('   \n\t ')).toBe('note-empty')
  })

  it('acepta un texto con el largo máximo exacto', () => {
    expect(problemOf('x'.repeat(NOTE_LIMITS.bodyMaxLength))).toBeNull()
  })

  it('rechaza un texto con un carácter más que el máximo', () => {
    expect(problemOf('x'.repeat(NOTE_LIMITS.bodyMaxLength + 1))).toBe('note-too-long')
  })

  it('cuenta un emoji como un solo carácter, como la base', () => {
    const atTheLimit = 'x'.repeat(NOTE_LIMITS.bodyMaxLength - 1) + '👁'
    expect(problemOf(atTheLimit)).toBeNull()
  })

  it('mide el largo después de quitar los espacios de los extremos', () => {
    const paddedAtTheLimit = `   ${'x'.repeat(NOTE_LIMITS.bodyMaxLength)}   `
    expect(problemOf(paddedAtTheLimit)).toBeNull()
  })
})

it('isNoteValidationError reconoce su error y no confunde otros ni valores sueltos', () => {
  expect(isNoteValidationError(noteValidationError('note-empty'))).toBe(true)
  expect(isNoteValidationError({ code: 'storage-failed' })).toBe(false)
  expect(isNoteValidationError(null)).toBe(false)
  expect(isNoteValidationError('CLIENTS_NOTE_INVALID')).toBe(false)
})
