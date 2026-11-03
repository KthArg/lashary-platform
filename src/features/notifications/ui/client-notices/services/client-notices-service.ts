import { createClient } from '@/shared/lib/supabase/server'
import { systemClock } from '@/shared/clock'
import { isErr } from '@/shared/result'
import { loadClientNotices } from '@/features/notifications/application/client-notices'
import { clientNoticeRepository } from '@/features/notifications/db/client-notice-repository'
import type { ClientNotice } from '@/features/notifications/domain/client-notice'

export type ClientNoticesResult = { ok: true; notices: ClientNotice[] } | { ok: false }

export async function loadMyClientNotices(): Promise<ClientNoticesResult> {
  const result = await loadClientNotices({ repository: clientNoticeRepository(await createClient()), clock: systemClock })()
  if (isErr(result)) return { ok: false }
  return { ok: true, notices: result.value }
}
