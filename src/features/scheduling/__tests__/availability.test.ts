import { describe, expect, it } from 'vitest'
import {
  ClosedDate,
  InvalidBlockRangeError,
  InvalidDateError,
  InvalidDayOfWeekError,
  InvalidTimeRangeError,
  ManualBlock,
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

describe('ManualBlock', () => {
  it('acepta un bloqueo válido', () => {
    const block = new ManualBlock({
      resourceId: 'r1',
      startsAt: new Date('2026-10-01T14:00:00Z'),
      endsAt: new Date('2026-10-01T15:00:00Z'),
    })
    expect(block.endsAt.getTime()).toBeGreaterThan(block.startsAt.getTime())
  })

  it('rechaza ends_at <= starts_at', () => {
    expect(
      () =>
        new ManualBlock({
          resourceId: 'r1',
          startsAt: new Date('2026-10-01T15:00:00Z'),
          endsAt: new Date('2026-10-01T14:00:00Z'),
        })
    ).toThrow(InvalidBlockRangeError)
  })
})
