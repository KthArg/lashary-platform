import { describe, it, expect } from 'vitest'
import {
  closedDateFormSchema,
  manualBlockFormSchema,
  timeToMinutes,
  weeklyBlockFormSchema,
} from '../validation/availability-schema'
import { schedulingMessages } from '../../messages'

const validationMessages = schedulingMessages.availability.validation

describe('availability-schema', () => {
  it('timeToMinutes convierte HH:MM a minutos desde la medianoche', () => {
    expect(timeToMinutes('00:00')).toBe(0)
    expect(timeToMinutes('09:30')).toBe(570)
    expect(timeToMinutes('23:59')).toBe(1439)
  })

  it('bloque semanal: convierte día y horas', () => {
    const parsed = weeklyBlockFormSchema.parse({ weekday: '2', start: '09:00', end: '12:30' })
    expect(parsed).toEqual({ weekday: 2, start: 540, end: 750 })
  })

  it('bloque semanal: fin 00:00 significa hasta la medianoche', () => {
    expect(weeklyBlockFormSchema.parse({ weekday: '5', start: '18:00', end: '00:00' }).end).toBe(1440)
  })

  it('bloque semanal: rechaza día fuera de rango y horas mal escritas, con texto externalizado', () => {
    const result = weeklyBlockFormSchema.safeParse({ weekday: '8', start: '9:00', end: '25:00' })
    expect(result.success).toBe(false)
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message)
    expect(messages).toEqual([validationMessages.weekday, validationMessages.time, validationMessages.time])
  })

  it('día cerrado: valida fecha real y tipo; nombre vacío queda en null', () => {
    expect(closedDateFormSchema.parse({ date: '2026-12-25', kind: 'holiday', label: ' ' })).toEqual({
      date: '2026-12-25',
      kind: 'holiday',
      label: null,
    })
    const result = closedDateFormSchema.safeParse({ date: '2026-02-30', kind: 'vacaciones' })
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message)
    expect(messages).toEqual([validationMessages.date, validationMessages.kind])
  })

  it('bloqueo: convierte horas y recorta el motivo', () => {
    expect(
      manualBlockFormSchema.parse({ date: '2026-10-20', start: '09:00', end: '11:00', reason: ' banco ' }),
    ).toEqual({ date: '2026-10-20', start: 540, end: 660, reason: 'banco' })
  })
})
