import { STUDIO_TIME_ZONE } from '@/shared/studio-time'

export const REMINDER_MESSAGE_TEXTS = {
  greeting: 'Hola',
  intro: 'te recordamos tu cita en LASHARY:',
  techniqueLabel: 'Técnica',
  whenLabel: 'Fecha y hora',
  emailSubject: 'Recordatorio de tu cita en LASHARY',
}

const dateTimeFormatter = new Intl.DateTimeFormat('es-CR', {
  timeZone: STUDIO_TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

export function formatStudioDateTime(instant: Date): string {
  return dateTimeFormatter.format(instant)
}

export type ReminderMessageInput = { techniqueName: string; startsAt: Date }

export function buildReminderMessage(input: ReminderMessageInput): string {
  return [
    `${REMINDER_MESSAGE_TEXTS.greeting}, ${REMINDER_MESSAGE_TEXTS.intro}`,
    `${REMINDER_MESSAGE_TEXTS.techniqueLabel}: ${input.techniqueName}`,
    `${REMINDER_MESSAGE_TEXTS.whenLabel}: ${formatStudioDateTime(input.startsAt)}`,
  ].join('\n')
}

export function buildReminderTemplateVariables(input: ReminderMessageInput): string[] {
  return [input.techniqueName, formatStudioDateTime(input.startsAt)]
}
