import { describe, it, expect } from 'vitest'
import { MAX_MANUAL_BLOCK_REASON_LENGTH } from '@/features/scheduling/domain/manual-blocks.constants'
import {
  blockSlotsFormSchema,
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

  it('espacios: un campo vacío o no numérico no se convierte en el minuto 0', () => {
    for (const slot of ['', ' ', '-30', '9.5', 'abc']) {
      const parsed = blockSlotsFormSchema.safeParse({ date: '2026-10-20', slotStartMinutes: [slot] })
      expect(parsed.success).toBe(false)
      expect(parsed.error?.issues.map((issue) => issue.message)).toEqual([validationMessages.pickSlot])
    }
  })

  it('espacios: convierte los minutos y admite hasta los 48 espacios de un día', () => {
    const slotsOfADay = Array.from({ length: 48 }, (_, index) => String(index * 30))
    const parsed = blockSlotsFormSchema.parse({ date: '2026-10-20', slotStartMinutes: slotsOfADay })
    expect(parsed.slotStartMinutes).toHaveLength(48)
    expect(parsed.slotStartMinutes[1]).toBe(30)
    expect(blockSlotsFormSchema.safeParse({ date: '2026-10-20', slotStartMinutes: [...slotsOfADay, '0'] }).success).toBe(false)
  })

  it('bloqueos: el motivo llega hasta el tope en los dos formularios (US-AGE-07)', () => {
    const longestReason = 'a'.repeat(MAX_MANUAL_BLOCK_REASON_LENGTH)
    const forms = [
      { schema: manualBlockFormSchema, fields: { date: '2026-10-20', start: '09:00', end: '11:00' } },
      { schema: blockSlotsFormSchema, fields: { date: '2026-10-20', slotStartMinutes: ['540'] } },
    ]
    for (const { schema, fields } of forms) {
      expect(schema.safeParse({ ...fields, reason: longestReason }).success).toBe(true)
      const tooLong = schema.safeParse({ ...fields, reason: `${longestReason}a` })
      expect(tooLong.success).toBe(false)
      expect(tooLong.error?.issues.map((issue) => issue.message)).toEqual([validationMessages.reasonTooLong])
    }
  })
})
