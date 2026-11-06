import { formatStudioDateTime } from '@/shared/studio-time'
import type { ClientNotice } from './client-notice'

export const CLIENT_NOTICE_MESSAGE_TEXTS = {
  rejected: (serviceName: string, requested: string, kept: string) =>
    `La administradora no aceptó cambiar tu cita de ${serviceName} al ${requested}, así que sigue el ${kept}`,
  expired: (serviceName: string, requested: string, kept: string) =>
    `Tu pedido de cambiar la cita de ${serviceName} al ${requested} venció sin respuesta, así que sigue el ${kept}`,
  emailSubject: 'Tu cita en LASHARY sigue en su horario',
}

export function buildClientNoticeMessage(notice: Pick<ClientNotice, 'kind' | 'serviceName' | 'requestedStartsAt' | 'keptStartsAt'>): string {
  const requested = formatStudioDateTime(notice.requestedStartsAt)
  const kept = formatStudioDateTime(notice.keptStartsAt)
  return notice.kind === 'reschedule_rejected'
    ? CLIENT_NOTICE_MESSAGE_TEXTS.rejected(notice.serviceName, requested, kept)
    : CLIENT_NOTICE_MESSAGE_TEXTS.expired(notice.serviceName, requested, kept)
}
