import { ok, isErr, type Result } from '@/shared/result'
import { computeReminderSendAt } from '../domain/reminder'
import type { SchedulingReadPort, ReminderRepository, RepositoryFailure } from './ports'

export type ReconcileRemindersDeps = {
  listPending: ReminderRepository['listPending']
  getAppointmentSnapshot: SchedulingReadPort['getAppointmentSnapshot']
  reschedulePending: ReminderRepository['reschedulePending']
  cancelPending: ReminderRepository['cancelPending']
}

export type ReconcileRemindersSummary = { cancelled: number; rescheduled: number }

const sameInstant = (firstInstant: Date, secondInstant: Date): boolean =>
  firstInstant.getTime() === secondInstant.getTime()

export const reconcileReminders =
  (deps: ReconcileRemindersDeps) =>
  async (): Promise<Result<ReconcileRemindersSummary, RepositoryFailure>> => {
    const pending = await deps.listPending()
    if (isErr(pending)) return pending

    let cancelled = 0
    let rescheduled = 0

    for (const reminder of pending.value) {
      const current = await deps.getAppointmentSnapshot(reminder.appointmentId)
      if (isErr(current)) return current

      if (current.value === null) {
        const result = await deps.cancelPending(reminder.appointmentId)
        if (isErr(result)) return result
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
      if (isErr(result)) return result
      rescheduled += 1
    }

    return ok({ cancelled, rescheduled })
  }
