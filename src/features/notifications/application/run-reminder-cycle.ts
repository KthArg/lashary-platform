import { ok, isErr, type Result } from '@/shared/result'
import { discoverReminders, type DiscoverRemindersDeps } from './discover-reminders'
import { reconcileReminders, type ReconcileRemindersDeps } from './reconcile-reminders'
import { sendDueReminders, type SendDueRemindersDeps } from './send-due-reminders'
import type { RepositoryFailure, SchedulingMaintenancePort } from './ports'

export type RunReminderCycleDeps = DiscoverRemindersDeps &
  ReconcileRemindersDeps &
  SendDueRemindersDeps & {
    expireUndecidedReschedules: SchedulingMaintenancePort['expireUndecidedReschedules']
  }

export type RunReminderCycleSummary = {
  expiredReschedules: number
  expireFailed: number
  discovered: number
  discoverFailed: number
  releasedExpiredClaims: number
  cancelled: number
  rescheduled: number
  reconcileFailed: number
  sent: number
  retried: number
  exhausted: number
  sendErrored: number
}

export const runReminderCycle =
  (deps: RunReminderCycleDeps) =>
  async (): Promise<Result<RunReminderCycleSummary, RepositoryFailure>> => {
    const expiry = await deps.expireUndecidedReschedules()

    const discovery = await discoverReminders(deps)()
    if (isErr(discovery)) return discovery

    const reconciliation = await reconcileReminders(deps)()
    if (isErr(reconciliation)) return reconciliation

    const sending = await sendDueReminders(deps)()
    if (isErr(sending)) return sending

    return ok({
      expiredReschedules: isErr(expiry) ? 0 : expiry.value,
      expireFailed: isErr(expiry) ? 1 : 0,
      discovered: discovery.value.discovered,
      discoverFailed: discovery.value.failed,
      releasedExpiredClaims: reconciliation.value.releasedExpiredClaims,
      cancelled: reconciliation.value.cancelled,
      rescheduled: reconciliation.value.rescheduled,
      reconcileFailed: reconciliation.value.failed,
      sent: sending.value.sent,
      retried: sending.value.retried,
      exhausted: sending.value.exhausted,
      sendErrored: sending.value.errored,
    })
  }
