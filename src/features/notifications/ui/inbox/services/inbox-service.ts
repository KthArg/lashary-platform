import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { loadInbox } from '../../../application/inbox'
import { inboxRepository } from '../../../db/inbox-repository'
import type { AdminInboxResult } from '../types/inbox-results'

export async function loadAdminInbox(): Promise<AdminInboxResult> {
  const result = await loadInbox(inboxRepository(await createClient()))()
  if (isErr(result)) return { ok: false }
  return { ok: true, inbox: result.value }
}
