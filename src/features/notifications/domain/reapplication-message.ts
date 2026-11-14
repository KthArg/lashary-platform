import { formatStudioDate } from '@/shared/studio-time'

export const REAPPLICATION_MESSAGE_TEXTS = {
  greeting: 'Hola',
  intro: 'ya se acerca el momento de re-aplicar tu técnica en LASHARY:',
  techniqueLabel: 'Técnica',
  dueDateLabel: 'Fecha estimada',
  callToAction: 'Agenda tu próxima cita cuando quieras.',
  emailSubject: 'Es momento de re-aplicar tu técnica en LASHARY',
}

export type ReapplicationMessageInput = { techniqueName: string; dueAt: Date }

export function buildReapplicationMessage(input: ReapplicationMessageInput): string {
  return [
    `${REAPPLICATION_MESSAGE_TEXTS.greeting}, ${REAPPLICATION_MESSAGE_TEXTS.intro}`,
    `${REAPPLICATION_MESSAGE_TEXTS.techniqueLabel}: ${input.techniqueName}`,
    `${REAPPLICATION_MESSAGE_TEXTS.dueDateLabel}: ${formatStudioDate(input.dueAt)}`,
    REAPPLICATION_MESSAGE_TEXTS.callToAction,
  ].join('\n')
}

export function buildReapplicationTemplateVariables(input: ReapplicationMessageInput): string[] {
  return [input.techniqueName, formatStudioDate(input.dueAt)]
}
