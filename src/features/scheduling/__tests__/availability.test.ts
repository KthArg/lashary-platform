import { describe, expect, it } from 'vitest'
import { InvalidDayOfWeekError, InvalidTimeRangeError, WeeklyAvailabilityBlock } from '../domain/availability'

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
