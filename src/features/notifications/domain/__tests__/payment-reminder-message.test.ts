import { describe, it, expect } from 'vitest'
import { formatMoney, moneyFromColones } from '@/shared/money'
import {
  PAYMENT_REMINDER_MESSAGE_TEXTS,
  buildPaymentReminderMessage,
  buildPaymentReminderTemplateVariables,
} from '../payment-reminder-message'

describe('buildPaymentReminderMessage', () => {
  it('incluye el monto adeudado (criterio 2)', () => {
    const message = buildPaymentReminderMessage({ amountOwed: 18000 })

    expect(message).toContain(formatMoney(moneyFromColones(18000)))
    expect(message).toContain(PAYMENT_REMINDER_MESSAGE_TEXTS.amountLabel)
  })

  it('pide comunicarse con el estudio mientras no exista el enlace para regularizar (US-MOR-03)', () => {
    expect(buildPaymentReminderMessage({ amountOwed: 18000 })).toContain(PAYMENT_REMINDER_MESSAGE_TEXTS.callToAction)
  })

  it('un monto distinto da un mensaje distinto', () => {
    expect(buildPaymentReminderMessage({ amountOwed: 5000 })).not.toBe(buildPaymentReminderMessage({ amountOwed: 18000 }))
  })
})

describe('buildPaymentReminderTemplateVariables', () => {
  it('da el monto como única variable, para una plantilla de WhatsApp aprobada por Meta', () => {
    expect(buildPaymentReminderTemplateVariables({ amountOwed: 18000 })).toEqual([formatMoney(moneyFromColones(18000))])
  })
})
