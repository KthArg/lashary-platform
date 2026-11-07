import { ok, isErr, type Result } from '@/shared/result'
import { discoverReminders, type DiscoverRemindersDeps } from './discover-reminders'
import { reconcileReminders, type ReconcileRemindersDeps } from './reconcile-reminders'
import { sendDueReminders, type SendDueRemindersDeps } from './send-due-reminders'
import type { SendConfirmationRequestsSummary } from './send-confirmation-requests'
import type { RepositoryFailure, SchedulingMaintenancePort } from './ports'

export type RunReminderCycleDeps = DiscoverRemindersDeps &
  ReconcileRemindersDeps &
  SendDueRemindersDeps & {
    expireUndecidedReschedules: SchedulingMaintenancePort['expireUndecidedReschedules']
    sendConfirmationRequests: () => Promise<Result<SendConfirmationRequestsSummary, RepositoryFailure>>
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
  confirmationsSent: number
  confirmationsRetried: number
  confirmationsExhausted: number
  confirmationsErrored: number
  confirmationsUnconfigured: number
  confirmationsCancelled: number
  confirmationsFailed: number
}

const NO_CONFIRMATIONS_SENT: SendConfirmationRequestsSummary = {
  sent: 0,
  retried: 0,
  exhausted: 0,
  errored: 0,
  unconfigured: 0,
  cancelled: 0,
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

    const confirmations = await deps.sendConfirmationRequests()
    const confirmationSummary = isErr(confirmations) ? NO_CONFIRMATIONS_SENT : confirmations.value

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
      confirmationsSent: confirmationSummary.sent,
      confirmationsRetried: confirmationSummary.retried,
      confirmationsExhausted: confirmationSummary.exhausted,
      confirmationsErrored: confirmationSummary.errored,
      confirmationsUnconfigured: confirmationSummary.unconfigured,
      confirmationsCancelled: confirmationSummary.cancelled,
      confirmationsFailed: isErr(confirmations) ? 1 : 0,
    })
  }
