'use server'

import { revalidatePath } from 'next/cache'
import { ADMIN_PORTAL_ROUTES, requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { systemClock } from '@/shared/clock'
import { isErr } from '@/shared/result'
import { loadMoreNotices, markNotice } from '@/features/notifications/application/inbox'
import { inboxRepository } from '@/features/notifications/db/inbox-repository'
import { INBOX_ERRORS } from '@/features/notifications/ui/inbox/constants/inbox-strings'
import { loadMoreSchema, markNoticeSchema } from '@/features/notifications/ui/inbox/validation/mark-notice-schema'
import type { LoadMoreNoticesResult, MarkNoticeActionResult } from '@/features/notifications/ui/inbox/types/inbox-results'

export async function markNoticeAction(input: unknown): Promise<MarkNoticeActionResult> {
  await requireAdminSession()

  const parsed = markNoticeSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: INBOX_ERRORS.invalidInput }

  const repository = inboxRepository(await createClient())
  const result = await markNotice({ repository, clock: systemClock })(parsed.data)
  if (isErr(result)) {
    const error = result.error === 'notice-not-found' ? INBOX_ERRORS.notFound : INBOX_ERRORS.saveFailed
    return { ok: false, error }
  }

  revalidatePath(ADMIN_PORTAL_ROUTES.root, 'layout')
  return { ok: true }
}

export async function loadMoreNoticesAction(input: unknown): Promise<LoadMoreNoticesResult> {
  await requireAdminSession()

  const parsed = loadMoreSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: INBOX_ERRORS.invalidInput }

  const result = await loadMoreNotices(inboxRepository(await createClient()))(parsed.data.offset)
  if (isErr(result)) return { ok: false, error: INBOX_ERRORS.loadMoreFailed }
  return { ok: true, page: result.value }
}
