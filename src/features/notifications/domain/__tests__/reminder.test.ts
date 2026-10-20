import { describe, it, expect } from 'vitest'
import { isOk, isErr } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import {
  buildReminder,
  computeReminderSendAt,
  hasExhaustedRetries,
  isReminderDue,
  reminderToSnapshot,
  MAX_REMINDER_ATTEMPTS,
} from '../reminder'

describe('computeReminderSendAt', () => {
  it('resta 24 horas a la hora de inicio de la cita', () => {
    expect(computeReminderSendAt(fixedDate('2026-11-02T15:00:00Z'))).toEqual(fixedDate('2026-11-01T15:00:00Z'))
  })
})

describe('buildReminder', () => {
  const baseInput = {
    appointmentId: 'appt-1',
    clientId: 'client-1',
    startsAt: fixedDate('2026-11-02T15:00:00Z'),
    techniqueName: 'Lifting de pestañas',
    createdAt: fixedDate('2026-11-01T10:00:00Z'),
  }

  it('crea el recordatorio pendiente con sendAt 24h antes', () => {
    const result = buildReminder('rem-1', baseInput)
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(reminderToSnapshot(result.value)).toEqual({
      id: 'rem-1',
      appointmentId: 'appt-1',
      clientId: 'client-1',
      startsAt: baseInput.startsAt,
      techniqueName: 'Lifting de pestañas',
      sendAt: fixedDate('2026-11-01T15:00:00Z'),
      status: 'pending',
      attempts: 0,
      lastError: null,
      lastChannel: null,
      sentAt: null,
    })
  })

  it('rechaza una cita que ya empezó respecto del momento en que se programa', () => {
    const result = buildReminder('rem-1', { ...baseInput, startsAt: fixedDate('2026-11-01T09:00:00Z') })
    expect(isErr(result)).toBe(true)
  })

  it('rechaza campos vacíos', () => {
    const result = buildReminder('rem-1', { ...baseInput, techniqueName: '   ' })
    expect(isErr(result)).toBe(true)
  })
})

describe('isReminderDue', () => {
  const snapshot = {
    id: 'rem-1', appointmentId: 'appt-1', clientId: 'client-1',
    startsAt: fixedDate('2026-11-02T15:00:00Z'), techniqueName: 'Técnica',
    sendAt: fixedDate('2026-11-01T15:00:00Z'), status: 'pending' as const,
    attempts: 0, lastError: null, lastChannel: null, sentAt: null,
  }

  it('está vencido cuando ya pasó la hora de envío y sigue pendiente', () => {
    expect(isReminderDue(snapshot, fixedDate('2026-11-01T15:00:01Z'))).toBe(true)
  })

  it('no está vencido antes de la hora de envío', () => {
    expect(isReminderDue(snapshot, fixedDate('2026-11-01T14:59:59Z'))).toBe(false)
  })

  it('no está vencido si ya no está pendiente', () => {
    expect(isReminderDue({ ...snapshot, status: 'sent' }, fixedDate('2026-11-01T16:00:00Z'))).toBe(false)
  })
})

describe('hasExhaustedRetries', () => {
  const snapshot = {
    id: 'rem-1', appointmentId: 'appt-1', clientId: 'client-1',
    startsAt: fixedDate('2026-11-02T15:00:00Z'), techniqueName: 'Técnica',
    sendAt: fixedDate('2026-11-01T15:00:00Z'), status: 'pending' as const,
    attempts: 0, lastError: null, lastChannel: null, sentAt: null,
  }

  it('no agotó los reintentos por debajo del máximo', () => {
    expect(hasExhaustedRetries({ ...snapshot, attempts: MAX_REMINDER_ATTEMPTS - 1 })).toBe(false)
  })

  it('agotó los reintentos al llegar al máximo', () => {
    expect(hasExhaustedRetries({ ...snapshot, attempts: MAX_REMINDER_ATTEMPTS })).toBe(true)
  })
})
