import { ok, isErr, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { computeReminderSendAt, hasAppointmentAlreadyStarted } from '../domain/reminder'
import type { SchedulingReadPort, ReminderRepository, RepositoryFailure } from './ports'

export type ReconcileRemindersDeps = {
  releaseExpiredClaims: ReminderRepository['releaseExpiredClaims']
  listPending: ReminderRepository['listPending']
  getAppointmentSnapshot: SchedulingReadPort['getAppointmentSnapshot']
  reschedulePending: ReminderRepository['reschedulePending']
  cancelPending: ReminderRepository['cancelPending']
  clock: Clock
}

export type ReconcileRemindersSummary = {
  releasedExpiredClaims: number
  cancelled: number
  rescheduled: number
  failed: number
}

const sameInstant = (firstInstant: Date, secondInstant: Date): boolean =>
  firstInstant.getTime() === secondInstant.getTime()

export const reconcileReminders =
  (deps: ReconcileRemindersDeps) =>
  async (): Promise<Result<ReconcileRemindersSummary, RepositoryFailure>> => {
    const now = deps.clock()

    const released = await deps.releaseExpiredClaims(now)
    if (isErr(released)) return released

    const pending = await deps.listPending()
    if (isErr(pending)) return pending

    let cancelled = 0
    let rescheduled = 0
    let failed = 0

    for (const reminder of pending.value) {
      const current = await deps.getAppointmentSnapshot(reminder.appointmentId)
      if (isErr(current)) {
        console.error(`[notifications] no se pudo leer la cita ${reminder.appointmentId} al reconciliar: ${current.error}`)
        failed += 1
        continue
      }

      const noLongerRemindable =
        current.value === null || hasAppointmentAlreadyStarted(current.value, now)
      if (noLongerRemindable) {
        const result = await deps.cancelPending(reminder.appointmentId)
        if (isErr(result)) {
          console.error(`[notifications] no se pudo cancelar el recordatorio de la cita ${reminder.appointmentId}: ${result.error}`)
          failed += 1
          continue
        }
        cancelled += 1
        continue
      }

      const moved =
        !sameInstant(current.value.startsAt, reminder.startsAt) ||
        current.value.techniqueName !== reminder.techniqueName
      if (!moved) continue

      const result = await deps.reschedulePending({
        appointmentId: reminder.appointmentId,
        startsAt: current.value.startsAt,
        techniqueName: current.value.techniqueName,
        sendAt: computeReminderSendAt(current.value.startsAt),
      })
      if (isErr(result)) {
        console.error(`[notifications] no se pudo reprogramar el recordatorio de la cita ${reminder.appointmentId}: ${result.error}`)
        failed += 1
        continue
      }
      rescheduled += 1
    }

    return ok({ releasedExpiredClaims: released.value.length, cancelled, rescheduled, failed })
  }
