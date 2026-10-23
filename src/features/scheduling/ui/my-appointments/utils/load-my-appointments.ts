import { isErr } from '@/shared/result'
import type { Result } from '@/shared/result'
import type { StorageFailed } from '../../../domain/errors'
import type { MyAppointment } from '../../../application/ports'
import type { MyAppointmentsData } from '../types/my-appointments.types'

export type MyAppointmentsDeps = {
  isClient: () => Promise<boolean>
  list: () => Promise<Result<MyAppointment[], StorageFailed>>
}

export async function loadMyAppointments(deps: MyAppointmentsDeps): Promise<MyAppointmentsData> {
  if (!(await deps.isClient())) return { status: 'forbidden' }

  const result = await deps.list()
  if (isErr(result)) return { status: 'error' }
  return { status: 'ready', appointments: result.value }
}
