import { describe, it, expect } from 'vitest'
import { addCalendarDays, isCalendarDate, studioDateOf, studioLocalToUtc } from '../studio-time'

describe('studio-time', () => {
  it.each([
    ['2026-10-14', true],
    ['2028-02-29', true],
    ['2026-02-29', false],
    ['2026-02-30', false],
    ['2026-13-01', false],
    ['14/10/2026', false],
    ['', false],
  ])('isCalendarDate(%s) = %s', (value, expected) => {
    expect(isCalendarDate(value)).toBe(expected)
  })

  it('studioDateOf usa la fecha del estudio, no la de UTC', () => {
    expect(studioDateOf(new Date('2026-10-15T03:00:00Z'))).toBe('2026-10-14')
    expect(studioDateOf(new Date('2026-10-15T06:00:00Z'))).toBe('2026-10-15')
  })

  it('studioLocalToUtc convierte la hora de pared del estudio a UTC', () => {
    expect(studioLocalToUtc('2026-10-20', 9 * 60).toISOString()).toBe('2026-10-20T15:00:00.000Z')
    expect(studioLocalToUtc('2026-10-20', 21 * 60 + 30).toISOString()).toBe(
      '2026-10-21T03:30:00.000Z',
    )
  })

  it('addCalendarDays cruza fin de mes, de año y años bisiestos', () => {
    expect(addCalendarDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addCalendarDays('2028-03-01', -1)).toBe('2028-02-29')
    expect(addCalendarDays('2026-10-16', 0)).toBe('2026-10-16')
  })

  it('ida y vuelta: la fecha del estudio de un instante convertido es la misma', () => {
    const instant = studioLocalToUtc('2026-12-31', 23 * 60 + 59)
    expect(studioDateOf(instant)).toBe('2026-12-31')
  })
})
