export const INBOX_LIMIT = 20

export type InboxNoticeKind = 'booking_created' | 'appointment_cancelled' | 'appointment_rescheduled'

type InboxNoticeBase = {
  id: string
  appointmentId: string
  clientName: string
  serviceName: string
  startsAt: Date
  readAt: Date | null
  createdAt: Date
}

export type BookingCreatedNotice = InboxNoticeBase & { kind: 'booking_created' }

export type AppointmentCancelledNotice = InboxNoticeBase & { kind: 'appointment_cancelled'; forfeitedDeposit: number }

export type AppointmentRescheduledNotice = InboxNoticeBase & { kind: 'appointment_rescheduled'; previousStartsAt: Date }

export type InboxNotice = BookingCreatedNotice | AppointmentCancelledNotice | AppointmentRescheduledNotice

export function isUnread(notice: InboxNotice): boolean {
  return notice.readAt === null
}

export function lostDeposit(notice: AppointmentCancelledNotice): boolean {
  return notice.forfeitedDeposit > 0
}
