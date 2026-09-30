import { describe, expect, it } from 'vitest'
import { formatClosedDate, formatInstant, formatTime } from '../format'

describe('formatTime', () => {
  it('recorta los segundos que devuelve Postgres', () => {
    expect(formatTime('09:00:00')).toBe('09:00')
    expect(formatTime('17:30')).toBe('17:30')
  })
})

describe('formatClosedDate', () => {
  it('formatea YYYY-MM-DD a DD/MM/YYYY sin corrimiento de zona horaria', () => {
    expect(formatClosedDate('2026-12-25')).toBe('25/12/2026')
    expect(formatClosedDate('2026-01-01')).toBe('01/01/2026')
  })
})

describe('formatInstant', () => {
  it('muestra el instante en hora de Costa Rica (UTC-6)', () => {
    const result = formatInstant(new Date('2026-10-01T20:00:00.000Z'))
    expect(result).toContain('2:00')
  })
})
