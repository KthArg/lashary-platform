import { describe, it, expect } from 'vitest'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { addHours, addDays } from '../date-math'

describe('addHours', () => {
  it('suma horas positivas', () => {
    expect(addHours(fixedDate('2026-11-02T15:00:00Z'), 2)).toEqual(fixedDate('2026-11-02T17:00:00Z'))
  })

  it('resta horas con un número negativo', () => {
    expect(addHours(fixedDate('2026-11-02T15:00:00Z'), -24)).toEqual(fixedDate('2026-11-01T15:00:00Z'))
  })
})

describe('addDays', () => {
  it('suma días completos', () => {
    expect(addDays(fixedDate('2026-11-02T15:00:00Z'), 7)).toEqual(fixedDate('2026-11-09T15:00:00Z'))
  })

  it('resta días con un número negativo', () => {
    expect(addDays(fixedDate('2026-11-09T15:00:00Z'), -7)).toEqual(fixedDate('2026-11-02T15:00:00Z'))
  })

  it('con 0 días devuelve la misma fecha', () => {
    expect(addDays(fixedDate('2026-11-02T15:00:00Z'), 0)).toEqual(fixedDate('2026-11-02T15:00:00Z'))
  })
})
