import { describe, it, expect, vi } from 'vitest'
import { ok, err, isErr, isOk } from '@/shared/result'
import { isInvalidPaymentReminderFrequencyDays } from '../../domain/errors'
import { changePaymentReminderFrequencyDays, loadPaymentReminderFrequencyDays } from '../payment-reminder-settings'
import type { PaymentReminderSettingsPort } from '../ports'

const settings = (overrides: Partial<PaymentReminderSettingsPort> = {}): PaymentReminderSettingsPort => ({
  frequencyDays: async () => ok(7),
  setFrequencyDays: async (days) => ok(days),
  ...overrides,
})

describe('loadPaymentReminderFrequencyDays', () => {
  it('devuelve la frecuencia que tiene configurada el estudio', async () => {
    const result = await loadPaymentReminderFrequencyDays(settings())()

    expect(isOk(result) && result.value).toBe(7)
  })

  it('devuelve el fallo de la base tal cual', async () => {
    const result = await loadPaymentReminderFrequencyDays(settings({ frequencyDays: async () => err('repository-failed') }))()

    expect(isErr(result) && result.error).toBe('repository-failed')
  })
})

describe('changePaymentReminderFrequencyDays', () => {
  it('guarda una frecuencia válida y devuelve la que quedó (criterio 1)', async () => {
    const setFrequencyDays = vi.fn(async (days: number) => ok(days))

    const result = await changePaymentReminderFrequencyDays(settings({ setFrequencyDays }))(14)

    expect(setFrequencyDays).toHaveBeenCalledWith(14)
    expect(isOk(result) && result.value).toBe(14)
  })

  it.each([[1], [30]])('acepta el límite de %d días', async (days) => {
    const result = await changePaymentReminderFrequencyDays(settings())(days)

    expect(isOk(result) && result.value).toBe(days)
  })

  it.each([[0], [31], [-3], [7.5], [Number.NaN]])('rechaza %o sin llamar a la base: la frecuencia es un entero de 1 a 30', async (days) => {
    const setFrequencyDays = vi.fn(async (value: number) => ok(value))

    const result = await changePaymentReminderFrequencyDays(settings({ setFrequencyDays }))(days)

    expect(isErr(result) && isInvalidPaymentReminderFrequencyDays(result.error)).toBe(true)
    expect(setFrequencyDays).not.toHaveBeenCalled()
  })

  it('devuelve el fallo de la base tal cual', async () => {
    const result = await changePaymentReminderFrequencyDays(settings({ setFrequencyDays: async () => err('repository-failed') }))(10)

    expect(isErr(result) && result.error).toBe('repository-failed')
  })
})
