import { ok, isErr, type Result } from '@/shared/result'
import { discoverReminders, type DiscoverRemindersDeps } from './discover-reminders'
import { reconcileReminders, type ReconcileRemindersDeps } from './reconcile-reminders'
import { sendDueReminders, type SendDueRemindersDeps } from './send-due-reminders'
import type { RepositoryFailure } from './ports'

export type RunReminderCycleDeps = DiscoverRemindersDeps & ReconcileRemindersDeps & SendDueRemindersDeps

export type RunReminderCycleSummary = {
  discovered: number
  cancelled: number
  rescheduled: number
  sent: number
  retried: number
  exhausted: number
}

// Una corrida completa del canal de recordatorios (US-NOT-03, ADR-0006): descubre citas nuevas
// dentro de la ventana de 24h, reconcilia las pendientes contra el estado vigente de la cita
// (criterio 3) y envía las que ya están vencidas (criterios 1, 2 y 4). La llama el cron.
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
      cancelled: reconciliation.value.cancelled,
      rescheduled: reconciliation.value.rescheduled,
      sent: sending.value.sent,
      retried: sending.value.retried,
      exhausted: sending.value.exhausted,
    })
  }
