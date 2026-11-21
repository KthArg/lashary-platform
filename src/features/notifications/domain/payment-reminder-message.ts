import { formatMoney, moneyFromColones } from '@/shared/money'

export const PAYMENT_REMINDER_MESSAGE_TEXTS = {
  greeting: 'Hola',
  intro: 'tienes un pago pendiente en LASHARY:',
  amountLabel: 'Monto adeudado',
  regularizeLine: (regularizeUrl: string) => `Regulariza tu saldo desde tu estado de cuenta: ${regularizeUrl}`,
  emailSubject: 'Tienes un pago pendiente en LASHARY',
}

export type PaymentReminderMessageInput = { amountOwed: number; regularizeUrl: string }

const amountText = (input: PaymentReminderMessageInput): string => formatMoney(moneyFromColones(input.amountOwed))

export function buildPaymentReminderMessage(input: PaymentReminderMessageInput): string {
  return [
    `${PAYMENT_REMINDER_MESSAGE_TEXTS.greeting}, ${PAYMENT_REMINDER_MESSAGE_TEXTS.intro}`,
    `${PAYMENT_REMINDER_MESSAGE_TEXTS.amountLabel}: ${amountText(input)}`,
    PAYMENT_REMINDER_MESSAGE_TEXTS.regularizeLine(input.regularizeUrl),
  ].join('\n')
}

export function buildPaymentReminderTemplateVariables(input: PaymentReminderMessageInput): string[] {
  return [amountText(input), input.regularizeUrl]
}
