import type { AftercareMessage } from './aftercare-message'

export const AFTERCARE_MESSAGE_TEXTS = {
  heading: (serviceName: string) => `Indicaciones de cuidado para tu ${serviceName}`,
  noteTitle: 'Una nota de la administradora para ti',
  myAppointmentsLine: (myAppointmentsUrl: string) => `Puedes volver a leerlas en Mis citas: ${myAppointmentsUrl}`,
  emailSubject: 'Cómo cuidar tu tratamiento en LASHARY',
}

const PARAGRAPH_SEPARATOR = '\n\n'

type AftercareMessageContent = Pick<AftercareMessage, 'serviceName' | 'aftercareText' | 'clientNote'>

export function buildAftercareMessage(message: AftercareMessageContent, myAppointmentsUrl: string): string {
  const noteSection = message.clientNote === null ? [] : [AFTERCARE_MESSAGE_TEXTS.noteTitle, message.clientNote]
  return [
    AFTERCARE_MESSAGE_TEXTS.heading(message.serviceName),
    message.aftercareText,
    ...noteSection,
    AFTERCARE_MESSAGE_TEXTS.myAppointmentsLine(myAppointmentsUrl),
  ].join(PARAGRAPH_SEPARATOR)
}

export const TEMPLATE_LINE_SEPARATOR = ' · '

const LINE_BREAKS = /\s*\n+\s*/
const REPEATED_SPACES = /\s+/g

const flattenForTemplate = (lines: string[]): string =>
  lines
    .flatMap((line) => line.split(LINE_BREAKS))
    .map((line) => line.replace(REPEATED_SPACES, ' ').trim())
    .filter((line) => line.length > 0)
    .join(TEMPLATE_LINE_SEPARATOR)

export function buildAftercareTemplateVariables(message: AftercareMessageContent, myAppointmentsUrl: string): string[] {
  const noteLine = message.clientNote === null ? [] : [`${AFTERCARE_MESSAGE_TEXTS.noteTitle}: ${message.clientNote}`]
  return [message.serviceName, flattenForTemplate([message.aftercareText, ...noteLine]), myAppointmentsUrl]
}
