'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { systemClock } from '@/shared/clock'
import { isErr } from '@/shared/result'
import { markNotice } from '../../../application/inbox'
import { inboxRepository } from '../../../db/inbox-repository'
import { ADMIN_LAYOUT_PATH, INBOX_ERRORS } from '../constants/inbox-strings'
import { markNoticeSchema } from '../validation/mark-notice-schema'
import type { MarkNoticeActionResult } from '../types/inbox-results'

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

  revalidatePath(ADMIN_LAYOUT_PATH, 'layout')
  return { ok: true }
}
