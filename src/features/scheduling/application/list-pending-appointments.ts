import type { Result } from '@/shared/result'
import type { StorageFailed } from '../domain/errors'
import type { PendingAppointment, PendingAppointmentsRepository } from './ports'

export async function listPendingAppointments(
  appointments: PendingAppointmentsRepository,
): Promise<Result<PendingAppointment[], StorageFailed>> {
  return appointments.listPending()
}
