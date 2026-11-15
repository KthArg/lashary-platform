import { isErr, type Result } from '@/shared/result'
import { isAuthorizedCronRequest } from '@/shared/lib/cron-auth'
import { runNotificationsReminderCycle, runReapplicationReminderCycle, type NotificationsCycleError } from '../index'

type CycleReport = { ok: boolean; body: unknown }

// Aísla cada ciclo: si uno lanza una excepción o devuelve un error, el otro corre igual y la
// respuesta trae ambos resúmenes (criterio 2 de US-NOT-05 — alguien tiene que llamar al ciclo).
async function runCycle<T>(label: string, run: () => Promise<Result<T, NotificationsCycleError>>): Promise<CycleReport> {
  try {
    const result = await run()
    if (isErr(result)) {
      const error = typeof result.error === 'string' ? result.error : 'repository-failed'
      console.error(`[notifications] corrida de ${label} falló: ${error}`)
      return { ok: false, body: { error } }
    }
    return { ok: true, body: result.value }
  } catch (cause) {
    console.error(`[notifications] corrida de ${label} falló con una excepción inesperada:`, cause)
    return { ok: false, body: { error: 'unexpected-error' } }
  }
}

export async function receiveReminderCronRequest(request: Request): Promise<Response> {
  if (!isAuthorizedCronRequest({ authorizationHeader: request.headers.get('authorization'), secret: process.env.CRON_SECRET })) {
    return Response.json({ error: 'no autorizado' }, { status: 401 })
  }

  const [reminders, reapplications] = await Promise.all([
    runCycle('recordatorios', runNotificationsReminderCycle),
    runCycle('re-aplicación', runReapplicationReminderCycle),
  ])

  const status = reminders.ok && reapplications.ok ? 200 : 503
  return Response.json({ reminders: reminders.body, reapplications: reapplications.body }, { status })
}
