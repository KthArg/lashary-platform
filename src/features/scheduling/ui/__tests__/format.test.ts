import { describe, expect, it } from 'vitest'
import { formatClosedDate, formatInstant, formatTime } from '../format'

const normalizeSpaces = (value: string) => value.replace(/\s/g, ' ')

describe('formatTime', () => {
  it('formatea la hora con Intl e ignora los segundos que devuelve Postgres', () => {
    expect(normalizeSpaces(formatTime('09:00:00'))).toBe('9:00 a. m.')
    expect(normalizeSpaces(formatTime('17:30'))).toBe('5:30 p. m.')
  })
})

describe('formatClosedDate', () => {
  it('formatea YYYY-MM-DD con Intl sin corrimiento de zona horaria', () => {
    expect(normalizeSpaces(formatClosedDate('2026-12-25'))).toBe('25 dic 2026')
    expect(normalizeSpaces(formatClosedDate('2026-01-01'))).toBe('1 ene 2026')
  })
})

describe('formatInstant', () => {
  it('muestra el instante en hora de Costa Rica (UTC-6)', () => {
    const result = formatInstant(new Date('2026-10-01T20:00:00.000Z'))
    expect(normalizeSpaces(result)).toBe('1 oct 2026, 2:00 p. m.')
  })
})
