import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, isErr, type Result } from '@/shared/result'
import { clientRepository } from './db/client-repository'
import { getClient } from './application/queries'

export type ClientContactForReminders = { phone: string; email: string }

export async function getClientContactForReminders(
  clientId: string,
  db?: SupabaseClient,
): Promise<Result<ClientContactForReminders | null, 'not-found' | 'failed'>> {
  const result = await getClient(await clientRepository(db))(clientId)
  if (isErr(result)) {
    if (result.error === 'not-found') return ok(null)
    return result
  }
  return ok({ phone: result.value.phone, email: result.value.email })
}
