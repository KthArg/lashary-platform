import { err, isErr, type Result } from '@/shared/result'
import { isAuthorizedCronRequest } from '@/shared/lib/cron-auth'
import { logError } from '@/shared/logger'
import {
  closeSystemClient,
  createSystemClient,
  readSystemClientConfigFromEnv,
  type SystemClientFailure,
} from '@/shared/lib/supabase/system'
import { detectUnpaid, type DetectUnpaidSummary } from '../application/detect-unpaid'
import { detectionRepository } from '../db/detection-repository'
import type { DelinquencyStorageFailed } from '../domain/errors'

export type DetectionCronError = 'system-client-not-configured' | SystemClientFailure | DelinquencyStorageFailed

// Corre con la cuenta de sistema del cron (staff), igual que el de recordatorios: la función de la base
// exige staff y no hay otro camino para llamarla sin sesión.
export async function runDelinquencyDetection(): Promise<Result<DetectUnpaidSummary, DetectionCronError>> {
  const config = readSystemClientConfigFromEnv(process.env)
  if (config === null) return err('system-client-not-configured')

  const client = await createSystemClient(config)
  if (isErr(client)) return client
  try {
    return await detectUnpaid(detectionRepository(client.value))()
  } finally {
    await closeSystemClient(client.value)
  }
}

const errorLabel = (error: DetectionCronError): string => (typeof error === 'string' ? error : error.message)

export async function receiveDetectionCronRequest(request: Request): Promise<Response> {
  if (!isAuthorizedCronRequest({ authorizationHeader: request.headers.get('authorization'), secret: process.env.CRON_SECRET })) {
    return Response.json({ error: 'no autorizado' }, { status: 401 })
  }

  try {
    const result = await runDelinquencyDetection()
    if (isErr(result)) {
      logError('delinquency', 'la detección falló', errorLabel(result.error))
      return Response.json({ error: typeof result.error === 'string' ? result.error : 'storage-failed' }, { status: 503 })
    }
    return Response.json(result.value)
  } catch (cause) {
    logError('delinquency', 'la detección falló con una excepción inesperada', cause instanceof Error ? cause.message : String(cause))
    return Response.json({ error: 'unexpected-error' }, { status: 500 })
  }
}
