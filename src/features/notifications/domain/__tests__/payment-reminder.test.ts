import { describe, it, expect } from 'vitest'
import { fixedDate } from '@/shared/testing/fixed-clock'
import {
  PAYMENT_REMINDER_FREQUENCY_DAYS_DEFAULT,
  isPaymentReminderDue,
  isValidPaymentReminderFrequencyDays,
  paymentReminderKey,
} from '../payment-reminder'

describe('isValidPaymentReminderFrequencyDays', () => {
  it('acepta de 1 a 30 días, enteros', () => {
    expect(isValidPaymentReminderFrequencyDays(1)).toBe(true)
    expect(isValidPaymentReminderFrequencyDays(PAYMENT_REMINDER_FREQUENCY_DAYS_DEFAULT)).toBe(true)
    expect(isValidPaymentReminderFrequencyDays(30)).toBe(true)
  })

  it('rechaza 0, 31, decimales y lo que no es un número', () => {
    expect(isValidPaymentReminderFrequencyDays(0)).toBe(false)
    expect(isValidPaymentReminderFrequencyDays(31)).toBe(false)
    expect(isValidPaymentReminderFrequencyDays(7.5)).toBe(false)
    expect(isValidPaymentReminderFrequencyDays('7')).toBe(false)
    expect(isValidPaymentReminderFrequencyDays(null)).toBe(false)
  })

  it('el valor por defecto es 7', () => {
    expect(PAYMENT_REMINDER_FREQUENCY_DAYS_DEFAULT).toBe(7)
  })
})

describe('isPaymentReminderDue (criterio 1)', () => {
  const NOW = fixedDate('2026-11-17T12:00:00Z')

  it('sin envío anterior, toca ya', () => {
    expect(isPaymentReminderDue(null, 7, NOW)).toBe(true)
  })

  it('antes de cumplirse la frecuencia desde el último envío, no toca', () => {
    expect(isPaymentReminderDue(fixedDate('2026-11-11T12:00:01Z'), 7, NOW)).toBe(false)
  })

  it('justo al cumplirse la frecuencia, toca', () => {
    expect(isPaymentReminderDue(fixedDate('2026-11-10T12:00:00Z'), 7, NOW)).toBe(true)
  })

  it('pasada la frecuencia, toca', () => {
    expect(isPaymentReminderDue(fixedDate('2026-10-01T12:00:00Z'), 7, NOW)).toBe(true)
  })

  it('la frecuencia configurada manda: 1 día toca al día siguiente, 30 no', () => {
    const sentYesterday = fixedDate('2026-11-16T12:00:00Z')

    expect(isPaymentReminderDue(sentYesterday, 1, NOW)).toBe(true)
    expect(isPaymentReminderDue(sentYesterday, 30, NOW)).toBe(false)
  })
})

describe('paymentReminderKey', () => {
  it('es la clienta y el día del envío: dos corridas del mismo día comparten clave, otro día no', () => {
    const sameDay = paymentReminderKey('client-1', fixedDate('2026-11-17T08:00:00Z'))

    expect(sameDay).toBe('client-1:2026-11-17')
    expect(paymentReminderKey('client-1', fixedDate('2026-11-17T20:00:00Z'))).toBe(sameDay)
    expect(paymentReminderKey('client-1', fixedDate('2026-11-24T08:00:00Z'))).not.toBe(sameDay)
  })

  it('el día es el del estudio, no el de UTC: a las 18:00 de Costa Rica la clave no cambia', () => {
    expect(paymentReminderKey('client-1', fixedDate('2026-11-18T00:30:00Z'))).toBe('client-1:2026-11-17')
    expect(paymentReminderKey('client-1', fixedDate('2026-11-18T06:30:00Z'))).toBe('client-1:2026-11-18')
  })
})
