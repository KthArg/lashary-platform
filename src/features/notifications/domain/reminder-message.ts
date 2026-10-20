import { STUDIO_TIME_ZONE } from '@/shared/studio-time'

// Texto externalizado del recordatorio (DOM-009): un solo lugar que compone lo que lee la
// clienta por WhatsApp o email, con fecha y hora en la zona del estudio (DOM-003).
export const REMINDER_MESSAGE_TEXTS = {
  greeting: 'Hola',
  intro: 'te recordamos tu cita en LASHARY:',
  techniqueLabel: 'Técnica',
  whenLabel: 'Fecha y hora',
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

// Criterio 2 de US-NOT-03: el mensaje incluye fecha, hora y técnica reservada.
export function buildReminderMessage(input: ReminderMessageInput): string {
  const t = REMINDER_MESSAGE_TEXTS
  return [
    `${t.greeting}, ${t.intro}`,
    `${t.techniqueLabel}: ${input.techniqueName}`,
    `${t.whenLabel}: ${formatStudioDateTime(input.startsAt)}`,
  ].join('\n')
}
