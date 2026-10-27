import { timingSafeEqual } from 'node:crypto'
import { isErr } from '@/shared/result'
import { runNotificationsReminderCycle } from '../index'

export type CronAuthInput = { authorizationHeader: string | null; secret: string | undefined }

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}

export function isAuthorizedCronRequest({ authorizationHeader, secret }: CronAuthInput): boolean {
  if (!secret || !authorizationHeader) return false
  return constantTimeEquals(authorizationHeader, `Bearer ${secret}`)
}

export async function receiveReminderCronRequest(request: Request): Promise<Response> {
  if (!isAuthorizedCronRequest({ authorizationHeader: request.headers.get('authorization'), secret: process.env.CRON_SECRET })) {
    return Response.json({ error: 'no autorizado' }, { status: 401 })
  }

  try {
    const result = await runNotificationsReminderCycle()
    if (isErr(result)) {
      console.error(`[notifications] corrida de recordatorios falló: ${result.error}`)
      return Response.json({ error: result.error }, { status: 503 })
    }
    return Response.json(result.value)
  } catch (cause) {
    console.error('[notifications] corrida de recordatorios falló con una excepción inesperada:', cause)
    return Response.json({ error: 'unexpected-error' }, { status: 500 })
  }
}
