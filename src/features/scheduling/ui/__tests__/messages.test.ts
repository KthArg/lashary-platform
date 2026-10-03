import { describe, expect, it } from 'vitest'
import {
  closedDateAlreadyExistsError,
  invalidBlockRangeError,
  invalidDateError,
  invalidDayOfWeekError,
  invalidTimeRangeError,
} from '../../domain/errors'
import { dayLabel, describeSchedulingError, schedulingMessages } from '../messages'

const e = schedulingMessages.errors

describe('describeSchedulingError', () => {
  it('traduce cada error del dominio a su texto de schedulingMessages', () => {
    expect(describeSchedulingError(invalidTimeRangeError('10:00', '09:00'))).toBe(e.invalidTimeRange)
    expect(describeSchedulingError(invalidDayOfWeekError(9))).toBe(e.invalidDayOfWeek)
    expect(describeSchedulingError(invalidDateError('2026-99-99'))).toBe(e.invalidDate)
    expect(describeSchedulingError(invalidBlockRangeError())).toBe(e.invalidBlockRange)
  })

  it('muestra la fecha del feriado repetido formateada con Intl', () => {
    const text = describeSchedulingError(closedDateAlreadyExistsError('2026-12-25')).replace(/\s/g, ' ')
    expect(text).toBe('Ya existe un día no laborable registrado para el 25 dic 2026.')
  })
})

describe('dayLabel', () => {
  it('lee el nombre del día desde schedulingMessages', () => {
    expect(dayLabel(0)).toBe('Domingo')
    expect(dayLabel(3)).toBe('Miércoles')
  })
})
