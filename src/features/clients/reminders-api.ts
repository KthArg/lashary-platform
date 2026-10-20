import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, isErr, type Result } from '@/shared/result'
import { clientRepository } from './db/client-repository'
import { getClient } from './application/queries'

export type ClientContactForReminders = { phone: string; email: string }

// Lectura pública para notifications (US-NOT-03, ARCH-005): sin requireAdminSession (eso es
// autenticación web por cookies; el cron llama con su propia sesión de staff, inyectada acá, y
// la RLS de clients_profiles es quien realmente decide, SEC-001). Solo expone lo que el canal
// necesita, nunca notes (dato más sensible que el contacto).
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
