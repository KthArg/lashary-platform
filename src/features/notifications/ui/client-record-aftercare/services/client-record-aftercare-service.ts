import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { loadClientRecordAftercare } from '@/features/notifications/application/client-record-aftercare'
import { clientRecordAftercareRepository } from '@/features/notifications/db/client-record-aftercare-repository'
import type { AdminAftercare } from '@/features/notifications/domain/aftercare-message'

export type ClientRecordAftercareResult = { ok: true; aftercare: AdminAftercare[] } | { ok: false }

export async function loadClientAftercareForAdmin(clientId: string): Promise<ClientRecordAftercareResult> {
  const result = await loadClientRecordAftercare({ repository: clientRecordAftercareRepository(await createClient()) })(clientId)
  if (isErr(result)) return { ok: false }
  return { ok: true, aftercare: result.value }
}
