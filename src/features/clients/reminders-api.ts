import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err, type Result } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'

export type ClientContactForReminders = { phone: string; email: string }

const CLIENTS_TABLE = 'clients_profiles'
const CONTACT_COLUMNS = 'phone, email'

export async function getClientContactForReminders(
  clientId: string,
  db?: SupabaseClient,
): Promise<Result<ClientContactForReminders | null, 'failed'>> {
  const supabase = db ?? (await createClient())
  const { data, error } = await supabase.from(CLIENTS_TABLE).select(CONTACT_COLUMNS).eq('id', clientId).maybeSingle()
  if (error) return err('failed')
  return ok(data ?? null)
}
