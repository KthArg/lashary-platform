import { isErr, type Result } from '@/shared/result'
import { isAuthorizedCronRequest } from '@/shared/lib/cron-auth'
import { logError } from '@/shared/logger'
import {
  runNotificationsReminderCycle,
  runReapplicationReminderCycle,
  runPaymentReminderCycle,
  type NotificationsCycleError,
} from '../index'

type CycleReport = { ok: boolean; body: unknown }

async function runCycle<T>(label: string, run: () => Promise<Result<T, NotificationsCycleError>>): Promise<CycleReport> {
  try {
    const result = await run()
    if (isErr(result)) {
      logError('notifications', `corrida de ${label} falló`, result.error)
      return { ok: false, body: { error: result.error } }
    }
    return { ok: true, body: result.value }
  } catch (cause) {
    logError('notifications', `corrida de ${label} falló con una excepción inesperada`, cause instanceof Error ? cause.message : String(cause))
    return { ok: false, body: { error: 'unexpected-error' } }
  }
}

export async function receiveReminderCronRequest(request: Request): Promise<Response> {
  if (!isAuthorizedCronRequest({ authorizationHeader: request.headers.get('authorization'), secret: process.env.CRON_SECRET })) {
    return Response.json({ error: 'no autorizado' }, { status: 401 })
  }

  const [reminders, reapplications, paymentReminders] = await Promise.all([
    runCycle('recordatorios', runNotificationsReminderCycle),
    runCycle('re-aplicación', runReapplicationReminderCycle),
    runCycle('recordatorio de pago', runPaymentReminderCycle),
  ])

  const status = reminders.ok && reapplications.ok && paymentReminders.ok ? 200 : 503
  return Response.json(
    { reminders: reminders.body, reapplications: reapplications.body, paymentReminders: paymentReminders.body },
    { status },
  )
}
