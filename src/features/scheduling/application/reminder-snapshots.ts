import type { Result } from '@/shared/result'
import type { StorageFailed } from '../domain/errors'
import type {
  AppointmentReminderSnapshot,
  ReminderSnapshotsRepository,
  ReminderSnapshotsWindow,
} from './ports'

export async function listAppointmentsForReminders(
  repo: ReminderSnapshotsRepository,
  window: ReminderSnapshotsWindow,
): Promise<Result<AppointmentReminderSnapshot[], StorageFailed>> {
  return repo.listActiveStartingWithin(window)
}

export async function getAppointmentForReminder(
  repo: ReminderSnapshotsRepository,
  appointmentId: string,
): Promise<Result<AppointmentReminderSnapshot | null, StorageFailed>> {
  return repo.getActiveById(appointmentId)
}
