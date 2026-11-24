import { buildSiteUrl } from './site-url'

export const INACTIVE_REMINDER_MESSAGE_TEXTS = {
  greeting: 'Hola',
  intro: 'hace un tiempo que no te vemos en LASHARY y nos encantaría consentirte de nuevo.',
  callToAction: 'Agenda tu próxima cita cuando quieras:',
  unsubscribe: 'Si ya no quieres recibir estos recordatorios, date de baja aquí:',
  emailSubject: 'Te extrañamos en LASHARY',
}

export const INACTIVE_UNSUBSCRIBE_PATH = '/recordatorios/baja'

export type InactiveReminderMessageInput = {
  clientName: string
  bookingUrl: string
  unsubscribeUrl: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function greetingFor(clientName: string): string {
  const firstName = clientName.trim().split(/\s+/)[0] ?? ''
  return firstName ? `${INACTIVE_REMINDER_MESSAGE_TEXTS.greeting} ${firstName}` : INACTIVE_REMINDER_MESSAGE_TEXTS.greeting
}

export function buildInactiveReminderMessage(input: InactiveReminderMessageInput): string {
  return [
    `${greetingFor(input.clientName)}, ${INACTIVE_REMINDER_MESSAGE_TEXTS.intro}`,
    `${INACTIVE_REMINDER_MESSAGE_TEXTS.callToAction} ${input.bookingUrl}`,
    `${INACTIVE_REMINDER_MESSAGE_TEXTS.unsubscribe} ${input.unsubscribeUrl}`,
  ].join('\n')
}

export const isUnsubscribeToken = (value: string): boolean => UUID.test(value)

export function buildInactiveUnsubscribeUrl(siteUrl: string | undefined, token: string): string | null {
  if (!isUnsubscribeToken(token)) return null
  return buildSiteUrl(siteUrl, `${INACTIVE_UNSUBSCRIBE_PATH}/${token}`)
}
