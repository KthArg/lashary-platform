export const INBOX_LIMIT = 20

export type InboxNoticeKind =
  | 'booking_created'
  | 'appointment_cancelled'
  | 'appointment_rescheduled'
  | 'delinquency_review'
  | 'regularization_submitted'

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

// Una morosidad por revisar no es de una cita: lleva lo que debe la clienta y la cita de origen, sin servicio ni hora.
export type DelinquencyReviewNotice = {
  id: string
  kind: 'delinquency_review'
  appointmentId: string
  clientName: string
  pending: number
  readAt: Date | null
  createdAt: Date
}

// Una clienta envió un comprobante para regularizar (US-MOR-03): lleva lo que declaró pagar y la cita de la morosidad.
export type RegularizationSubmittedNotice = {
  id: string
  kind: 'regularization_submitted'
  appointmentId: string
  clientName: string
  declared: number
  readAt: Date | null
  createdAt: Date
}

export type InboxNotice =
  | BookingCreatedNotice
  | AppointmentCancelledNotice
  | AppointmentRescheduledNotice
  | DelinquencyReviewNotice
  | RegularizationSubmittedNotice

export function isUnread(notice: InboxNotice): boolean {
  return notice.readAt === null
}

export function lostDeposit(notice: AppointmentCancelledNotice): boolean {
  return notice.forfeitedDeposit > 0
}
