import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import {
  getClientContactForReminders as getContactFromRepository,
  type ClientContactForReminders,
} from './db/reminder-contact-repository'

export type { ClientContactForReminders }

export async function getClientContactForReminders(clientId: string, db?: SupabaseClient) {
  return getContactFromRepository(clientId, db ?? (await createClient()))
}
