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
