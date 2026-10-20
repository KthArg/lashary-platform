import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { createClosedDate } from '../closed-dates'
import { isClosedDateInvalid } from '../availability-errors'

const base = { id: 'c-1', resourceId: 'r-1', date: '2026-12-25', kind: 'holiday' }

describe('createClosedDate — US-AGE-01, criterio 2', () => {
  it('acepta un feriado con nombre', () => {
    const result = createClosedDate({ ...base, label: '  Navidad ' })
    expect(isOk(result) && result.value).toEqual({ ...base, label: 'Navidad' })
  })

  it('acepta un día no laborable sin nombre (label vacío queda en null)', () => {
    const result = createClosedDate({ ...base, kind: 'non_working', label: '   ' })
    expect(isOk(result) && result.value.label).toBeNull()
  })

  it('rechaza una fecha que no existe', () => {
    const result = createClosedDate({ ...base, date: '2026-02-30' })
    expect(isErr(result) && isClosedDateInvalid(result.error) && result.error.problems).toEqual([
      'la fecha no es válida',
    ])
  })

  it('rechaza un tipo fuera del vocabulario', () => {
    const result = createClosedDate({ ...base, kind: 'vacaciones' })
    expect(isErr(result) && result.error.problems).toEqual([
      'el tipo de día debe ser no laborable o feriado',
    ])
  })
})
