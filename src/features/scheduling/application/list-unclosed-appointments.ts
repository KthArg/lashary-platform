import { err, isErr, ok, type Result } from '@/shared/result'
import { UNCLOSED_APPOINTMENTS_LIMIT } from '../domain/appointment-closing.constants'
import type { StorageFailed } from '../domain/errors'
import type { UnclosedAppointment, UnclosedAppointmentsRepository } from './closing-ports'

export type UnclosedAppointments = {
  appointments: UnclosedAppointment[]
  isTruncated: boolean
}

export function listUnclosedAppointments(unclosed: UnclosedAppointmentsRepository) {
  return async function list(nowMs: number): Promise<Result<UnclosedAppointments, StorageFailed>> {
    const found = await unclosed.listUnclosed(nowMs, UNCLOSED_APPOINTMENTS_LIMIT + 1)
    if (isErr(found)) return err(found.error)

    return ok({
      appointments: found.value.slice(0, UNCLOSED_APPOINTMENTS_LIMIT),
      isTruncated: found.value.length > UNCLOSED_APPOINTMENTS_LIMIT,
    })
  }
}
