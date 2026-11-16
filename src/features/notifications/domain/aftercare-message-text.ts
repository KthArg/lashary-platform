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

export function buildAftercareTemplateVariables(message: Pick<AftercareMessage, 'serviceName'>, myAppointmentsUrl: string): string[] {
  return [message.serviceName, myAppointmentsUrl]
}
