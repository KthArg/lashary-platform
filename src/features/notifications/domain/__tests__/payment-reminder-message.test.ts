import { describe, it, expect } from 'vitest'
import { formatMoney, moneyFromColones } from '@/shared/money'
import {
  PAYMENT_REMINDER_MESSAGE_TEXTS,
  buildPaymentReminderMessage,
  buildPaymentReminderTemplateVariables,
} from '../payment-reminder-message'

const REGULARIZE_URL = 'https://lashary.example/portal/cuenta'

describe('buildPaymentReminderMessage', () => {
  it('incluye el monto adeudado (criterio 2)', () => {
    const message = buildPaymentReminderMessage({ amountOwed: 18000, regularizeUrl: REGULARIZE_URL })

    expect(message).toContain(formatMoney(moneyFromColones(18000)))
    expect(message).toContain(PAYMENT_REMINDER_MESSAGE_TEXTS.amountLabel)
  })

  it('lleva el enlace para regularizar el saldo (criterio 2)', () => {
    const message = buildPaymentReminderMessage({ amountOwed: 18000, regularizeUrl: REGULARIZE_URL })

    expect(message).toContain(PAYMENT_REMINDER_MESSAGE_TEXTS.regularizeLine(REGULARIZE_URL))
    expect(message).toContain(REGULARIZE_URL)
  })

  it('un monto distinto da un mensaje distinto', () => {
    expect(buildPaymentReminderMessage({ amountOwed: 5000, regularizeUrl: REGULARIZE_URL })).not.toBe(
      buildPaymentReminderMessage({ amountOwed: 18000, regularizeUrl: REGULARIZE_URL }),
    )
  })
})

describe('buildPaymentReminderTemplateVariables', () => {
  it('da el monto y el enlace como variables, en ese orden, para una plantilla de WhatsApp aprobada por Meta', () => {
    expect(buildPaymentReminderTemplateVariables({ amountOwed: 18000, regularizeUrl: REGULARIZE_URL })).toEqual([
      formatMoney(moneyFromColones(18000)),
      REGULARIZE_URL,
    ])
  })
})
