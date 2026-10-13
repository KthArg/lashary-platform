import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { selectTechnique, type SelectableTechnique } from '../technique-selection'

const technique = (overrides: Partial<SelectableTechnique> = {}): SelectableTechnique => ({
  id: 't1',
  isActive: true,
  durationFirstTimeMin: 90,
  durationRetouchMin: 60,
  bufferMin: 15,
  ...overrides,
})

describe('selectTechnique', () => {
  it('primera vez: duración = primera vez + limpieza (criterio 3)', () => {
    const result = selectTechnique(technique(), true)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) {
      expect(result.value).toEqual({
        techniqueId: 't1',
        isFirstTime: true,
        totalDurationMin: 105,
      })
    }
  })

  it('re-aplicación: duración = retoque + limpieza', () => {
    const result = selectTechnique(technique(), false)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.totalDurationMin).toBe(75)
  })

  it('bufferMin en 0 no rompe el cálculo', () => {
    const result = selectTechnique(technique({ bufferMin: 0 }), true)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.totalDurationMin).toBe(90)
  })

  it('rechaza una técnica inactiva', () => {
    const result = selectTechnique(technique({ isActive: false }), true)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(result.error.code).toBe('SCHEDULING_TECHNIQUE_NOT_SELECTABLE')
      expect(result.error.reason).toBe('inactive')
    }
  })

  it('rechaza re-aplicación cuando la técnica no ofrece retoque', () => {
    const result = selectTechnique(technique({ durationRetouchMin: null }), false)
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.reason).toBe('no_retouch')
  })

  it('devuelve una selección de una sola técnica (criterio 4: no una lista)', () => {
    const result = selectTechnique(technique(), true)
    if (isOk(result)) {
      expect(typeof result.value.techniqueId).toBe('string')
    }
  })
})
