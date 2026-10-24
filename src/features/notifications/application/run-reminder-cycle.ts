import { ok, isErr, type Result } from '@/shared/result'
import { discoverReminders, type DiscoverRemindersDeps } from './discover-reminders'
import { reconcileReminders, type ReconcileRemindersDeps } from './reconcile-reminders'
import { sendDueReminders, type SendDueRemindersDeps } from './send-due-reminders'
import type { RepositoryFailure } from './ports'

export type RunReminderCycleDeps = DiscoverRemindersDeps & ReconcileRemindersDeps & SendDueRemindersDeps

export type RunReminderCycleSummary = {
  discovered: number
  discoverFailed: number
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
    const discovery = await discoverReminders(deps)()
    if (isErr(discovery)) return discovery

    const reconciliation = await reconcileReminders(deps)()
    if (isErr(reconciliation)) return reconciliation

    const sending = await sendDueReminders(deps)()
    if (isErr(sending)) return sending

    return ok({
      discovered: discovery.value.discovered,
      discoverFailed: discovery.value.failed,
      cancelled: reconciliation.value.cancelled,
      rescheduled: reconciliation.value.rescheduled,
      reconcileFailed: reconciliation.value.failed,
      sent: sending.value.sent,
      retried: sending.value.retried,
      exhausted: sending.value.exhausted,
      sendErrored: sending.value.errored,
    })
  }
