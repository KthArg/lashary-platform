export const CLIENT_NOTICES_LIMIT = 5

export type ClientNoticeKind = 'reschedule_rejected' | 'reschedule_expired'

export type ClientNotice = {
  id: string
  kind: ClientNoticeKind
  appointmentId: string
  serviceName: string
  requestedStartsAt: Date
  keptStartsAt: Date
  createdAt: Date
}

export const CLIENT_NOTICE_MAX_ATTEMPTS = 5

export type ClientNoticeDelivery = Pick<ClientNotice, 'id' | 'kind' | 'serviceName' | 'requestedStartsAt' | 'keptStartsAt'> & {
  clientId: string
  attempts: number
}

export function hasExhaustedNoticeRetries(delivery: ClientNoticeDelivery): boolean {
  return delivery.attempts >= CLIENT_NOTICE_MAX_ATTEMPTS
}
