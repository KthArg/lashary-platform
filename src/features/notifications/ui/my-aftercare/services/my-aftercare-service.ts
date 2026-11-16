import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { loadClientAftercare } from '@/features/notifications/application/client-aftercare'
import { clientAftercareRepository } from '@/features/notifications/db/client-aftercare-repository'
import type { ClientAftercare } from '@/features/notifications/domain/aftercare-message'

export type MyAftercareResult = { ok: true; aftercare: ClientAftercare[] } | { ok: false }

export async function loadMyAftercare(): Promise<MyAftercareResult> {
  const result = await loadClientAftercare({ repository: clientAftercareRepository(await createClient()) })()
  if (isErr(result)) return { ok: false }
  return { ok: true, aftercare: result.value }
}
