import type { Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import type { StorageFailed } from '../domain/errors'
import type { MyAppointment, MyAppointmentsRepository } from './ports'

export type ListMyAppointmentsDeps = {
  appointments: MyAppointmentsRepository
  clock: Clock
}

export async function listMyAppointments({
  appointments,
  clock,
}: ListMyAppointmentsDeps): Promise<Result<MyAppointment[], StorageFailed>> {
  return appointments.listUpcoming(clock().getTime())
}
