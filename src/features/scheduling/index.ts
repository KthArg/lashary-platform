import { listClientAppointments as listClientAppointmentsUseCase } from './application/list-client-appointments'
import { clientAppointmentsRepository } from './db/client-appointments-repository'
import type { ListClientAppointmentsQuery } from './application/client-appointments-ports'

export { ClientTechniqueSelectionPage } from './ui/ClientTechniqueSelectionPage'
export { AdminAvailabilityPage } from './ui/availability/components/AdminAvailabilityPage'
export { ClientCalendarPage } from './ui/client-calendar/components/ClientCalendarPage'
export { schedulingMessages } from './ui/messages'
export { clientCalendarMessages } from './ui/client-calendar/constants/client-calendar-strings'
export { ApprovalQueue } from './ui/approval-queue/components/ApprovalQueue'
export { listPendingAppointmentsAction } from './ui/approval-queue/actions/approval-queue-actions'
export { APPROVAL_QUEUE_LABELS } from './ui/approval-queue/constants/approval-queue.labels'
export { BookingConfirmPage } from './ui/booking-confirm/components/BookingConfirmPage'
export { bookingConfirmMessages } from './ui/booking-confirm/constants/booking-confirm-strings'
export { AlertsPage } from './ui/alerts/components/AlertsPage'
export type {
  ClientAppointmentStatus,
  ClientAppointmentView,
  ClientAppointmentsPage,
  ListClientAppointmentsQuery,
} from './application/client-appointments-ports'
export {
  CLIENT_APPOINTMENTS_DEFAULT_PAGE_SIZE,
  CLIENT_APPOINTMENTS_MAX_PAGE_SIZE,
} from './application/list-client-appointments'

export async function listClientAppointments(query: ListClientAppointmentsQuery) {
  return listClientAppointmentsUseCase(await clientAppointmentsRepository())(query)
}
