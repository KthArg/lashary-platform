import { describe, it, expect } from 'vitest'
import {
  addCalendarDays,
  formatStudioDate,
  isCalendarDate,
  parseStudioDateTimeInput,
  studioDateOf,
  studioDateTimeInputValue,
  studioLocalToUtc,
} from '../studio-time'

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

  it('parseStudioDateTimeInput interpreta un <input type="datetime-local"> en la hora del estudio (auditoría A1)', () => {
    expect(parseStudioDateTimeInput('2026-10-20T09:00')?.toISOString()).toBe(
      '2026-10-20T15:00:00.000Z',
    )
  })

  it.each([
    ['sin ceros a la izquierda', '2026-10-20T9:00'],
    ['sin T', '2026-10-20 09:00'],
    ['fecha inexistente', '2026-02-30T09:00'],
    ['hora fuera de rango', '2026-10-20T24:00'],
    ['basura', 'no es una fecha'],
    ['vacío', ''],
  ])('parseStudioDateTimeInput rechaza %s con null, no Invalid Date', (_name, value) => {
    expect(parseStudioDateTimeInput(value)).toBeNull()
  })

  it('studioDateTimeInputValue y parseStudioDateTimeInput son inversas (ida y vuelta sin desplazamiento)', () => {
    const original = '2026-10-20T09:00'
    const instant = parseStudioDateTimeInput(original)
    expect(instant).not.toBeNull()
    expect(studioDateTimeInputValue(instant as Date)).toBe(original)
  })

  it('formatStudioDate da la fecha sin hora, en la zona del estudio', () => {
    expect(formatStudioDate(new Date('2026-11-13T05:00:00Z'))).toBe('12 de noviembre de 2026')
    expect(formatStudioDate(new Date('2026-11-13T18:00:00Z'))).toBe('13 de noviembre de 2026')
  })
})
