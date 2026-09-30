import { describe, expect, it } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  isInvalidBlockRangeError,
  isInvalidDateError,
  isInvalidDayOfWeekError,
  isInvalidTimeRangeError,
} from '../domain/errors'
import { createClosedDate, createManualBlock, createWeeklyAvailabilityBlock } from '../domain/availability'

describe('createWeeklyAvailabilityBlock', () => {
  it('acepta un bloque válido', () => {
    const result = createWeeklyAvailabilityBlock({
      resourceId: 'r1',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.startTime).toBe('09:00')
  })

  it('rechaza end_time <= start_time', () => {
    const result = createWeeklyAvailabilityBlock({ resourceId: 'r1', dayOfWeek: 1, startTime: '17:00', endTime: '09:00' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(isInvalidTimeRangeError(result.error)).toBe(true)
  })

  it('rechaza día de la semana fuera de 0-6', () => {
    const result = createWeeklyAvailabilityBlock({
      resourceId: 'r1',
      // @ts-expect-error probando el invariante fuera del tipo
      dayOfWeek: 7,
      startTime: '09:00',
      endTime: '17:00',
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(isInvalidDayOfWeekError(result.error)).toBe(true)
  })

  it('rechaza hora sin cero a la izquierda: "9:00" no es una comparación de texto válida', () => {
    const result = createWeeklyAvailabilityBlock({ resourceId: 'r1', dayOfWeek: 1, startTime: '9:00', endTime: '17:00' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(isInvalidTimeRangeError(result.error)).toBe(true)
  })

  it('acepta horas con segundos, tal como las devuelve Postgres', () => {
    const result = createWeeklyAvailabilityBlock({
      resourceId: 'r1',
      dayOfWeek: 1,
      startTime: '09:00:00',
      endTime: '17:00:00',
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.endTime).toBe('17:00:00')
  })
})

describe('createClosedDate', () => {
  it('AC-2: acepta una fecha válida', () => {
    const result = createClosedDate({ resourceId: 'r1', closedDate: '2026-12-25', reason: 'Navidad' })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.closedDate).toBe('2026-12-25')
  })

  it('rechaza un formato de fecha inválido', () => {
    const result = createClosedDate({ resourceId: 'r1', closedDate: '25/12/2026' })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(isInvalidDateError(result.error)).toBe(true)
  })
})

describe('createManualBlock', () => {
  it('AC-3 (mecanismo): acepta un bloqueo válido', () => {
    const result = createManualBlock({
      resourceId: 'r1',
      startsAt: new Date('2026-10-01T14:00:00Z'),
      endsAt: new Date('2026-10-01T15:00:00Z'),
    })
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.endsAt.getTime()).toBeGreaterThan(result.value.startsAt.getTime())
  })

  it('rechaza ends_at <= starts_at', () => {
    const result = createManualBlock({
      resourceId: 'r1',
      startsAt: new Date('2026-10-01T15:00:00Z'),
      endsAt: new Date('2026-10-01T14:00:00Z'),
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(isInvalidBlockRangeError(result.error)).toBe(true)
  })
})
