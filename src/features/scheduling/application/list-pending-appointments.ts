import type { PendingAppointment, PendingAppointmentsRepository } from './ports'

export async function listPendingAppointments(
  appointments: PendingAppointmentsRepository,
): Promise<PendingAppointment[]> {
  return appointments.listPending()
}
