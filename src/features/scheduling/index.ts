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
export { DailyAgendaPage } from './ui/daily-agenda/components/DailyAgendaPage'
export type { ClientLinks } from './ui/daily-agenda/types/daily-agenda.types'
export { CancellationPolicyPage } from './ui/cancellation-policy/components/CancellationPolicyPage'
export { MyAppointmentsPage } from './ui/my-appointments/components/MyAppointmentsPage'
export { myAppointmentsMessages } from './ui/my-appointments/constants/my-appointments-strings'
export { ReschedulePolicyPage } from './ui/reschedule-policy/components/ReschedulePolicyPage'
export { ReschedulePage } from './ui/reschedule/components/ReschedulePage'
export { reschedulePageMessages } from './ui/reschedule/constants/reschedule-page-strings'
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

export {
  listAppointmentsForReminders as listSchedulingAppointmentsForReminders,
  getAppointmentForReminder as getSchedulingAppointmentForReminder,
  expireUndecidedReschedules as expireSchedulingUndecidedReschedules,
} from './reminders-api'
export type { AppointmentReminderSnapshot, ReminderSnapshotsWindow } from './application/ports'
