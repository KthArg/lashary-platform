import { timingSafeEqual } from 'node:crypto'

export type CronAuthInput = { authorizationHeader: string | null; secret: string | undefined }

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}

// Vercel Cron manda `Authorization: Bearer <CRON_SECRET>`. Sin secreto configurado nadie entra.
export function isAuthorizedCronRequest({ authorizationHeader, secret }: CronAuthInput): boolean {
  if (!secret || !authorizationHeader) return false
  return constantTimeEquals(authorizationHeader, `Bearer ${secret}`)
}
