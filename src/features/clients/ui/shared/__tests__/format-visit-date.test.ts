import { describe, it, expect } from 'vitest'
import { formatVisitDate } from '../format-visit-date'

describe('formatVisitDate', () => {
  it('muestra el día en la hora del estudio, no en UTC', () => {
    expect(formatVisitDate(Date.parse('2026-07-01T05:30:00Z'))).toBe('30 jun 2026')
  })

  it('muestra solo la fecha, sin la hora de la cita', () => {
    expect(formatVisitDate(Date.parse('2026-05-15T16:00:00Z'))).toBe('15 may 2026')
  })
})
