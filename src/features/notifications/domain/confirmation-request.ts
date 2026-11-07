import { formatStudioDateTime } from '@/shared/studio-time'
import type { ReminderChannelKind } from './reminder'

export type ConfirmationRequestStatus = 'pending' | 'claimed' | 'sent' | 'failed' | 'cancelled'

export interface ConfirmationRequest {
  readonly id: string
  readonly appointmentId: string
  readonly clientId: string
  readonly startsAt: Date
  readonly serviceName: string
  readonly status: ConfirmationRequestStatus
  readonly attempts: number
  readonly lastChannel: ReminderChannelKind | null
}

export const CONFIRMATION_MESSAGE_TEXTS = {
  greeting: 'Hola',
  intro: 'tu cita en LASHARY fue aprobada:',
  serviceLabel: 'Servicio',
  whenLabel: 'Fecha y hora',
  action: 'Confirmá tu asistencia o cancelá la cita en Mis citas:',
  emailSubject: 'Confirmá tu cita en LASHARY',
}

export type ConfirmationMessageInput = { serviceName: string; startsAt: Date; appointmentsUrl: string }

export function buildConfirmationMessage(input: ConfirmationMessageInput): string {
  return [
    `${CONFIRMATION_MESSAGE_TEXTS.greeting}, ${CONFIRMATION_MESSAGE_TEXTS.intro}`,
    `${CONFIRMATION_MESSAGE_TEXTS.serviceLabel}: ${input.serviceName}`,
    `${CONFIRMATION_MESSAGE_TEXTS.whenLabel}: ${formatStudioDateTime(input.startsAt)}`,
    `${CONFIRMATION_MESSAGE_TEXTS.action} ${input.appointmentsUrl}`,
  ].join('\n')
}

export function buildConfirmationTemplateVariables(input: ConfirmationMessageInput): string[] {
  return [input.serviceName, formatStudioDateTime(input.startsAt), input.appointmentsUrl]
}
