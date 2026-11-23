import { formatMoney, moneyFromColones } from '@/shared/money'

export const PAYMENT_REMINDER_MESSAGE_TEXTS = {
  greeting: 'Hola',
  intro: 'tienes un pago pendiente en LASHARY:',
  amountLabel: 'Monto adeudado',
  callToAction: 'Comunícate con el estudio para regularizarlo y poder agendar de nuevo.',
  emailSubject: 'Tienes un pago pendiente en LASHARY',
}

export type PaymentReminderMessageInput = { amountOwed: number }

const amountText = (input: PaymentReminderMessageInput): string => formatMoney(moneyFromColones(input.amountOwed))

export function buildPaymentReminderMessage(input: PaymentReminderMessageInput): string {
  return [
    `${PAYMENT_REMINDER_MESSAGE_TEXTS.greeting}, ${PAYMENT_REMINDER_MESSAGE_TEXTS.intro}`,
    `${PAYMENT_REMINDER_MESSAGE_TEXTS.amountLabel}: ${amountText(input)}`,
    PAYMENT_REMINDER_MESSAGE_TEXTS.callToAction,
  ].join('\n')
}

export function buildPaymentReminderTemplateVariables(input: PaymentReminderMessageInput): string[] {
  return [amountText(input)]
}
