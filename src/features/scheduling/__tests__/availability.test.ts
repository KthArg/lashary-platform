import { describe, expect, it } from 'vitest'
import {
  ClosedDate,
  InvalidDateError,
  InvalidDayOfWeekError,
  InvalidTimeRangeError,
  WeeklyAvailabilityBlock,
} from '../domain/availability'

describe('WeeklyAvailabilityBlock', () => {
  it('acepta un bloque válido', () => {
    const block = new WeeklyAvailabilityBlock({
      resourceId: 'r1',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
    })
    expect(block.startTime).toBe('09:00')
  })

  it('rechaza end_time <= start_time', () => {
    expect(
      () => new WeeklyAvailabilityBlock({ resourceId: 'r1', dayOfWeek: 1, startTime: '17:00', endTime: '09:00' })
    ).toThrow(InvalidTimeRangeError)
  })

  it('rechaza día de la semana fuera de 0-6', () => {
    expect(
      () =>
        new WeeklyAvailabilityBlock({
          resourceId: 'r1',
          // @ts-expect-error probando el invariante fuera del tipo
          dayOfWeek: 7,
          startTime: '09:00',
          endTime: '17:00',
        })
    ).toThrow(InvalidDayOfWeekError)
  })
})

describe('ClosedDate', () => {
  it('acepta una fecha válida', () => {
    expect(new ClosedDate({ resourceId: 'r1', closedDate: '2026-12-25', reason: 'Navidad' }).closedDate).toBe(
      '2026-12-25'
    )
  })

  it('rechaza un formato de fecha inválido', () => {
    expect(() => new ClosedDate({ resourceId: 'r1', closedDate: '25/12/2026' })).toThrow(InvalidDateError)
  })
})
