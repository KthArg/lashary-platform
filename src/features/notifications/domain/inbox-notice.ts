export const INBOX_LIMIT = 20

export type InboxNoticeKind = 'booking_created'

export type InboxNotice = {
  id: string
  kind: InboxNoticeKind
  appointmentId: string
  clientName: string
  serviceName: string
  startsAt: Date
  readAt: Date | null
  createdAt: Date
}

export function isUnread(notice: InboxNotice): boolean {
  return notice.readAt === null
}
