import { formatStudioDateTime } from '@/shared/studio-time'

export const REMINDER_MESSAGE_TEXTS = {
  greeting: 'Hola',
  intro: 'te recordamos tu cita en LASHARY:',
  techniqueLabel: 'Técnica',
  whenLabel: 'Fecha y hora',
  emailSubject: 'Recordatorio de tu cita en LASHARY',
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
