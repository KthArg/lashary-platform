import { isErr } from '@/shared/result'
import { runNotificationsReminderCycle } from '../index'

export type CronAuthInput = { authorizationHeader: string | null; secret: string | undefined }

export function isAuthorizedCronRequest({ authorizationHeader, secret }: CronAuthInput): boolean {
  if (!secret) return false
  return authorizationHeader === `Bearer ${secret}`
}

export async function receiveReminderCronRequest(request: Request): Promise<Response> {
  if (!isAuthorizedCronRequest({ authorizationHeader: request.headers.get('authorization'), secret: process.env.CRON_SECRET })) {
    return Response.json({ error: 'no autorizado' }, { status: 401 })
  }

  const result = await runNotificationsReminderCycle()
  if (isErr(result)) {
    console.error(`[notifications] corrida de recordatorios falló: ${result.error}`)
    return Response.json({ error: result.error }, { status: 503 })
  }
  return Response.json(result.value)
}
