import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { evaluateCancellation, type CancellationInput } from '../appointment-cancellation'
import { MS_PER_HOUR } from '../appointment-cancellation.constants'

const APPOINTMENT_ID = 'cita-1'
const APPOINTMENT_START_MS = Date.parse('2027-09-06T15:00:00Z')
const DEFAULT_WINDOW_HOURS = 48
const DEPOSIT_REQUIRED = 10000
const HOURS_BEFORE_START_OUTSIDE_WINDOW = 72
const HOURS_BEFORE_START_INSIDE_WINDOW = 24

const nowBeforeStart = (hours: number): number => APPOINTMENT_START_MS - hours * MS_PER_HOUR

const baseInput: CancellationInput = {
  appointmentId: APPOINTMENT_ID,
  status: 'approved',
  startsAtMs: APPOINTMENT_START_MS,
  nowMs: nowBeforeStart(HOURS_BEFORE_START_OUTSIDE_WINDOW),
  windowHours: DEFAULT_WINDOW_HOURS,
  depositRequired: DEPOSIT_REQUIRED,
}

describe('evaluateCancellation', () => {
  it('con más antelación que la ventana no se pierde el anticipo (criterio 3)', () => {
    const result = evaluateCancellation(baseInput)
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ withinWindow: true, forfeitedDeposit: 0 })
  })

  it('con justo la antelación de la ventana todavía no se pierde (el límite es inclusivo)', () => {
    const result = evaluateCancellation({
      ...baseInput,
      nowMs: nowBeforeStart(DEFAULT_WINDOW_HOURS),
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.withinWindow).toBe(true)
    expect(result.value.forfeitedDeposit).toBe(0)
  })

  it('un milisegundo después del límite, el anticipo congelado de la cita se pierde (criterio 6)', () => {
    const result = evaluateCancellation({
      ...baseInput,
      nowMs: nowBeforeStart(DEFAULT_WINDOW_HOURS) + 1,
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ withinWindow: false, forfeitedDeposit: DEPOSIT_REQUIRED })
  })

  it('una cita confirmada cancelada fuera de la ventana pierde el anticipo', () => {
    const result = evaluateCancellation({
      ...baseInput,
      status: 'confirmed',
      nowMs: nowBeforeStart(HOURS_BEFORE_START_INSIDE_WINDOW),
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.forfeitedDeposit).toBe(DEPOSIT_REQUIRED)
  })

  it('una cita pendiente de aprobación no pierde el anticipo aunque cancele tarde', () => {
    const result = evaluateCancellation({
      ...baseInput,
      status: 'pending_approval',
      nowMs: nowBeforeStart(HOURS_BEFORE_START_INSIDE_WINDOW),
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ withinWindow: false, forfeitedDeposit: 0 })
  })

  it('sin anticipo requerido no hay nada que perder', () => {
    const result = evaluateCancellation({
      ...baseInput,
      depositRequired: 0,
      nowMs: nowBeforeStart(HOURS_BEFORE_START_INSIDE_WINDOW),
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.forfeitedDeposit).toBe(0)
  })

  it('con ventana de cero horas nunca se pierde el anticipo antes de la cita', () => {
    const result = evaluateCancellation({
      ...baseInput,
      windowHours: 0,
      nowMs: APPOINTMENT_START_MS - 1,
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value).toEqual({ withinWindow: true, forfeitedDeposit: 0 })
  })

  it.each(['rejected', 'cancelled', 'completed', 'no_show', 'desconocido'])(
    'una cita en estado %s no se puede cancelar',
    (status) => {
      const result = evaluateCancellation({ ...baseInput, status })
      expect(isErr(result)).toBe(true)
      if (!isErr(result)) return
      expect(result.error.code).toBe('SCHEDULING_APPOINTMENT_NOT_CANCELLABLE')
    },
  )

  it.each([APPOINTMENT_START_MS, APPOINTMENT_START_MS + 1])(
    'una cita que ya empezó o pasó (ahora = %s) no se puede cancelar',
    (nowMs) => {
      const result = evaluateCancellation({ ...baseInput, nowMs })
      expect(isErr(result)).toBe(true)
      if (!isErr(result)) return
      expect(result.error).toMatchObject({
        code: 'SCHEDULING_APPOINTMENT_NOT_CANCELLABLE',
        appointmentId: APPOINTMENT_ID,
      })
    },
  )

  it.each([
    ['startsAtMs', { startsAtMs: 1.5 }],
    ['nowMs', { nowMs: Number.NaN }],
    ['windowHours', { windowHours: -1 }],
    ['windowHours', { windowHours: 1.5 }],
    ['depositRequired', { depositRequired: -1 }],
    ['depositRequired', { depositRequired: 100.5 }],
  ])('rechaza %s inválido', (field, override) => {
    const result = evaluateCancellation({ ...baseInput, ...override })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error).toMatchObject({ code: 'SCHEDULING_INVALID_CANCELLATION_INPUT', field })
  })
})
