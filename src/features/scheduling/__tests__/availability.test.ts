import { describe, expect, it } from 'vitest'
import { InvalidDayOfWeekError, InvalidTimeRangeError } from '../domain/errors'
import { WeeklyAvailabilityBlock } from '../domain/availability'

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

  it('rechaza hora sin cero a la izquierda: "9:00" no es una comparación de texto válida', () => {
    expect(
      () => new WeeklyAvailabilityBlock({ resourceId: 'r1', dayOfWeek: 1, startTime: '9:00', endTime: '17:00' })
    ).toThrow(InvalidTimeRangeError)
  })

  it('acepta horas con segundos, tal como las devuelve Postgres', () => {
    const block = new WeeklyAvailabilityBlock({
      resourceId: 'r1',
      dayOfWeek: 1,
      startTime: '09:00:00',
      endTime: '17:00:00',
    })
    expect(block.endTime).toBe('17:00:00')
  })
})
