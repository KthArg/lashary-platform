import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { loadInbox } from '@/features/notifications/application/inbox'
import { inboxRepository } from '@/features/notifications/db/inbox-repository'
import type { AdminInboxResult } from '@/features/notifications/ui/inbox/types/inbox-results'

export async function loadAdminInbox(): Promise<AdminInboxResult> {
  const result = await loadInbox(inboxRepository(await createClient()))()
  if (isErr(result)) return { ok: false }
  return { ok: true, inbox: result.value }
}
