import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { bufferAsCleanup, computeAppointmentWindow } from '../appointment-window'
import { isSpaceNotAvailable, spaceNotAvailable } from '../errors'
import { MS_PER_MINUTE } from '../appointment-window.constants'

const SERVICE_START_MS = Date.parse('2027-03-01T10:00:00Z')
const SERVICE_DURATION_MIN = 60
const PREP_MIN = 15
const CLEANUP_MIN = 10
const baseInput = {
  startsAtMs: SERVICE_START_MS,
  serviceDurationMin: SERVICE_DURATION_MIN,
  prepMin: PREP_MIN,
  cleanupMin: CLEANUP_MIN,
}

describe('computeAppointmentWindow', () => {
  it('el rango ocupado incluye preparación antes y limpieza después (criterio 2)', () => {
    const result = computeAppointmentWindow(baseInput)
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.startsAtMs).toBe(Date.parse('2027-03-01T10:00:00Z'))
    expect(result.value.endsAtMs).toBe(Date.parse('2027-03-01T11:00:00Z'))
    expect(result.value.occupiedFromMs).toBe(Date.parse('2027-03-01T09:45:00Z'))
    expect(result.value.occupiedUntilMs).toBe(Date.parse('2027-03-01T11:10:00Z'))
  })

  it('sin preparación ni limpieza el rango ocupado es el servicio', () => {
    const result = computeAppointmentWindow({ ...baseInput, prepMin: 0, cleanupMin: 0 })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.occupiedFromMs).toBe(result.value.startsAtMs)
    expect(result.value.occupiedUntilMs).toBe(result.value.endsAtMs)
  })

  it('el rango siempre cubre el servicio completo, como exige el CHECK de la base', () => {
    const result = computeAppointmentWindow(baseInput)
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.occupiedFromMs).toBeLessThanOrEqual(result.value.startsAtMs)
    expect(result.value.occupiedUntilMs).toBeGreaterThanOrEqual(result.value.endsAtMs)
  })

  it('trabaja en milisegundos UTC: cruza la medianoche sin desfase', () => {
    const lateStartMs = Date.parse('2027-03-01T23:30:00Z')
    const result = computeAppointmentWindow({ ...baseInput, startsAtMs: lateStartMs })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.endsAtMs - lateStartMs).toBe(SERVICE_DURATION_MIN * MS_PER_MINUTE)
    expect(result.value.occupiedUntilMs).toBe(Date.parse('2027-03-02T00:40:00Z'))
  })

  it.each([
    ['startsAtMs', { startsAtMs: Number.NaN }],
    ['startsAtMs', { startsAtMs: Number.POSITIVE_INFINITY }],
    ['startsAtMs', { startsAtMs: 1.5 }],
    ['serviceDurationMin', { serviceDurationMin: 0 }],
    ['serviceDurationMin', { serviceDurationMin: -30 }],
    ['serviceDurationMin', { serviceDurationMin: 45.5 }],
    ['prepMin', { prepMin: -1 }],
    ['prepMin', { prepMin: Number.NaN }],
    ['cleanupMin', { cleanupMin: -5 }],
    ['cleanupMin', { cleanupMin: 2.5 }],
  ])('rechaza %s inválido con un error tipado', (field, override) => {
    const result = computeAppointmentWindow({ ...baseInput, ...override })
    expect(isErr(result)).toBe(true)
    if (!isErr(result)) return
    expect(result.error.code).toBe('SCHEDULING_INVALID_APPOINTMENT_WINDOW')
    expect(result.error.field).toBe(field)
  })
})

describe('bufferAsCleanup', () => {
  it('cuenta todo el buffer del catálogo como limpieza posterior', () => {
    expect(bufferAsCleanup(15)).toEqual({ prepMin: 0, cleanupMin: 15 })
  })
})

describe('spaceNotAvailable', () => {
  it('es un error tipado reconocible por su guarda', () => {
    const error = spaceNotAvailable('recurso-1')
    expect(error.code).toBe('SCHEDULING_SPACE_NOT_AVAILABLE')
    expect(error.resourceId).toBe('recurso-1')
    expect(isSpaceNotAvailable(error)).toBe(true)
    expect(isSpaceNotAvailable(new Error('otro'))).toBe(false)
    expect(isSpaceNotAvailable(null)).toBe(false)
  })
})
